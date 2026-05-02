import pandas as pd
import pycountry

df = pd.read_csv("RawData/worldcitiespop.csv", low_memory=False)

df = df.dropna(subset=["Population", "Latitude", "Longitude"])
df = df[df["Population"] > 0]

df["city"] = df["AccentCity"].fillna(df["City"])

# Convert 2-letter country code to full country name
def expand_country(code):
    try:
        return pycountry.countries.get(alpha_2=code.upper()).name
    except Exception:
        return None

df["country"] = df["Country"].map(expand_country)
df = df.dropna(subset=["country"])

df = df.rename(columns={"Population": "population", "Latitude": "latitude", "Longitude": "longitude"})

df[["city", "country", "population", "latitude", "longitude"]].to_csv(
    "CleanedData/Cleaned_Population.csv", index=False
)

