import pandas as pd

df = pd.read_csv("CleanedData/Cleaned_Hotels.csv")

print(df["HotelName"])