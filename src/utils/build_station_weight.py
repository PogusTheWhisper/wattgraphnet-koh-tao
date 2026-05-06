import pandas as pd

def build_station_weights(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute normalized reverse weights per station using record counts:
      - weight = max_count / count
      - so the station with the most records has weight == 1
      - stations with fewer records get weights > 1

    Returns a DataFrame with columns:
      station_name, normalized_reverse_weight
    """
    station_counts = df['station_name'].value_counts()

    # Normalize so max count has weight = 1
    max_count = station_counts.max()
    normalized_reverse_weights = max_count / station_counts

    # Convert to DataFrame for easier viewing
    station_weights_df = normalized_reverse_weights.reset_index()
    station_weights_df.columns = ['station_name', 'normalized_reverse_weight']
    return station_weights_df

