import pandas as pd

df = pd.read_csv("RawData/CrimeIndex.csv")

df_city_country = list(df["City"])

city, country = zip(*list(map(lambda x: x.split(", "), df_city_country)))

df["City"] = city
df["Country"] = country
df["Crime_Index"] = df["Crime Index"]
del df["Crime Index"]

df["Safety_Index"] = df["Safety Index"]
del df["Safety Index"]

df.to_csv("CleanedData/Cleaned_CrimeIndex.csv", index=False)