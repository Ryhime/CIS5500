import pandas as pd
import pycountry
from thefuzz import process
import geonamescache

df = pd.read_csv("RawData/CrimeIndex.csv")

df_city_country = list(df["City"])

spls = list(map(lambda x: x.split(", "), df_city_country))

city = list(map(lambda x: x[0], spls))
country = list(map(lambda x: x[-1], spls))
print(country)

df["City"] = city
df["Country"] = country
df["Crime_Index"] = df["Crime Index"]
del df["Crime Index"]

df["Safety_Index"] = df["Safety Index"]
del df["Safety Index"]


gc = geonamescache.GeonamesCache()
reference_cities = [c["name"] for c in gc.get_cities().values()]

def standardize_city(name, threshold=85):
    match, score = process.extractOne(name, reference_cities)
    return match if score >= threshold else name

df["City"] = df["City"].map(standardize_city)

df.to_csv("CleanedData/Cleaned_CrimeIndex.csv", index=False)
