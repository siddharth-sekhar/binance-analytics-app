import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller

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
