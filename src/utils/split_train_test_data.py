import pandas as pd

def split_train_test_data(df: pd.DataFrame,
                          train_ratio: float = 0.8,
                          date_col: str = 'Date',
                          station_col: str = 'station_name'
                         ) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split a time‑series DataFrame into train/test per station.

    Parameters
    ----------
    df : pd.DataFrame
        The full DataFrame; must contain a station identifier and a datetime column.
    train_ratio : float, default 0.8
        Fraction of each station’s data to include in the train set.
    date_col : str, default 'Date'
        Name of the datetime column to sort by.
    station_col : str, default 'station_name'
        Name of the column with station identifiers.

    Returns
    -------
    train_df : pd.DataFrame
        Concatenated training slices for each station.
    test_df : pd.DataFrame
        Concatenated testing slices for each station.
    """
    train_parts = []
    test_parts  = []
    
    # Group by station, sort by date, then split
    for station, g in df.groupby(station_col):
        g_sorted = g.sort_values(date_col)
        n = len(g_sorted)
        split_idx = int(n * train_ratio)
        
        train_parts.append(g_sorted.iloc[:split_idx])
        test_parts .append(g_sorted.iloc[split_idx:])
    
    # Concatenate and reset indexes
    train_df = pd.concat(train_parts).reset_index(drop=True)
    test_df  = pd.concat(test_parts ).reset_index(drop=True)
    
    return train_df, test_df

