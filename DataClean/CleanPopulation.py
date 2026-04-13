import pandas as pd
import country_converter as coco
import pycountry
import string
from thefuzz import process, fuzz
import geonamescache

cc = coco.CountryConverter()

df = pd.read_csv("RawData/worldcitiespop.csv")

df["Country"] = cc.convert(names=df["Country"], to="name_short")

def standardize_country(name):
    try:
        return pycountry.countries.lookup(name).name
    except LookupError:
        return name

df["Country"] = df["Country"].map(standardize_country)

df["City"] = list(map(lambda x: string.capwords(x) if type(x) is str else x, list(df["City"])))
del df["AccentCity"]
del df["Region"]

gc = geonamescache.GeonamesCache()
reference_cities = [c["name"] for c in gc.get_cities().values()]

def standardize_city(name, threshold=85):
    if not isinstance(name, str) or name.strip() == "":
        return name
    match, score = process.extractOne(name, reference_cities, scorer=fuzz.token_set_ratio)
    return match if score >= threshold else name

unique_cities = df[["City", "Country"]].drop_duplicates()
unique_cities["City_Clean"] = unique_cities["City"].map(standardize_city)

df = df.merge(unique_cities, on=["City", "Country"])
df["City"] = df["City_Clean"]
del df["City_Clean"]

df.to_csv("CleanedData/Cleaned_Population.csv", index=False)