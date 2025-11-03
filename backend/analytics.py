import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller
from typing import Optional, Dict

def resample_ticks_to_ohlcv(df_ticks: pd.DataFrame, timeframe: str):
    if df_ticks.empty:
        return pd.DataFrame()
    df_ticks = df_ticks.sort_index()
    ohlc = df_ticks["price"].resample(timeframe).ohlc()
    vol = df_ticks["size"].resample(timeframe).sum().rename("volume")
    res = pd.concat([ohlc, vol], axis=1).dropna()
    return res

def hedge_ratio_ols(series_y: pd.Series, series_x: pd.Series):
    # regress y = beta * x + c
    df = pd.concat([series_y, series_x], axis=1).dropna()
    if df.shape[0] < 2:
        return None
    y = df.iloc[:,0]
    X = sm.add_constant(df.iloc[:,1])
    model = sm.OLS(y, X).fit()
    beta = float(model.params.iloc[1])
    intercept = float(model.params.iloc[0])
    return {"beta": beta, "intercept": intercept, "rsq": float(model.rsquared)}

def hedge_ratio_kalman(series_y: pd.Series, series_x: pd.Series, process_var: float = 1e-5, obs_var: float = 1e-3) -> Optional[Dict[str, float]]:
    """
    Simple Kalman Filter to estimate time-varying beta and intercept in model: y_t = beta_t * x_t + c_t + noise
    Returns the last (beta, intercept) and rolling R^2 approximation.
    """
    df = pd.concat([series_y, series_x], axis=1).dropna()
    if df.shape[0] < 2:
        return None
    y = df.iloc[:,0].values.astype(float)
    x = df.iloc[:,1].values.astype(float)
    # State: [intercept, beta]
    state = np.array([0.0, 1.0])
    P = np.eye(2)
    Q = np.eye(2) * process_var
    R = obs_var
    y_hat_all = []
    for t in range(len(y)):
        # Predict
        state = state  # no state transition dynamics beyond identity
        P = P + Q
        # Observation
        H = np.array([1.0, x[t]])  # maps [c, beta] to y
        y_pred = H @ state
        S = H @ P @ H.T + R
        K = (P @ H.T) / S
        residual = y[t] - y_pred
        state = state + K * residual
        P = (np.eye(2) - np.outer(K, H)) @ P
        y_hat_all.append(y_pred)
    # Approximate R^2 using last predictions
    y_hat_all = np.array(y_hat_all)
    ss_res = float(np.sum((y - y_hat_all) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    rsq = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return {"beta": float(state[1]), "intercept": float(state[0]), "rsq": float(rsq)}

def compute_spread(series_y: pd.Series, series_x: pd.Series, beta: float, intercept: float=0.0):
    df = pd.concat([series_y, series_x], axis=1).dropna()
    if df.empty:
        return pd.Series(dtype=float)
    spread = df.iloc[:,0] - (beta * df.iloc[:,1] + intercept)
    spread.name = "spread"
    return spread

def rolling_zscore(series: pd.Series, window: int=60):
    if series.empty:
        return pd.Series(dtype=float)
    mean = series.rolling(window).mean()
    std = series.rolling(window).std().replace(0, np.nan)
    z = (series - mean) / std
    z.name = "zscore"
    return z

def adf_test(series: pd.Series):
    series = series.dropna()
    if series.shape[0] < 10:
        return {"stat": None, "pvalue": None, "nobs": 0}
    res = adfuller(series)
    return {"stat": float(res[0]), "pvalue": float(res[1]), "nobs": int(res[3])}

def rolling_correlation(series_a: pd.Series, series_b: pd.Series, window: int=60):
    df = pd.concat([series_a, series_b], axis=1).dropna()
    if df.empty:
        return pd.Series(dtype=float)
    return df.iloc[:,0].rolling(window).corr(df.iloc[:,1])

def backtest_mean_reversion(z: pd.Series, entry: float = 2.0, exit: float = 0.0):
    """
    Mini mean-reversion backtest: enter short spread when z > entry, exit when z < exit; 
    enter long spread when z < -entry, exit when z > -exit. Returns dict with trades and equity curve.
    """
    z = z.dropna()
    if z.empty:
        return {"trades": [], "equity": {}}
    position = 0  # -1 short spread, +1 long spread
    equity = 0.0
    equity_curve = []
    last_price = 0.0
    entry_z = None
    trades = []
    # Use spread proxy as z; PnL by z normalization is illustrative only
    for ts, zval in z.items():
        if position == 0:
            if zval > entry:
                position = -1
                entry_z = zval
                trades.append({"ts": str(ts), "side": "SHORT", "z": float(zval)})
            elif zval < -entry:
                position = 1
                entry_z = zval
                trades.append({"ts": str(ts), "side": "LONG", "z": float(zval)})
        else:
            # exit rules
            if (position == -1 and zval < exit) or (position == 1 and zval > -exit):
                pnl = (entry_z - zval) if position == -1 else (zval - entry_z)
                equity += pnl
                trades.append({"ts": str(ts), "side": "FLAT", "z": float(zval), "pnl": float(pnl), "equity": float(equity)})
                position = 0
                entry_z = None
        equity_curve.append((str(ts), float(equity)))
    equity_dict = {ts: val for ts, val in equity_curve}
    return {"trades": trades, "equity": equity_dict}

def correlation_matrix(symbol_to_close: Dict[str, pd.Series]):
    df = pd.DataFrame(symbol_to_close)
    df = df.dropna(how="any")
    if df.empty:
        return pd.DataFrame()
    return df.corr()
