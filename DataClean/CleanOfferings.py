import pandas as pd
import ast
from thefuzz import process
import geonamescache

df = pd.read_csv("RawData/offerings.csv")

# hotel_class
# Nothing

# region_id
del df["region_id"]

# url
# Nothing

# phone
del df["phone"]

# details
del df["details"]

# address
jsons = list(map(lambda x: ast.literal_eval(x), df["address"]))
df["state"] = list(map(lambda x: x["region"] if "region" in x else "", jsons))
df["street_address"] = list(map(lambda x: x["street-address"] if "street-address" in x else "", jsons))
df["postal_code"] = list(map(lambda x: x["postal-code"] if "postal-code" in x else "", jsons))
df["city"] = list(map(lambda x: x["locality"] if "locality" in x else "", jsons))
del df["address"]

# type
# Nothing

# id
# Nothing

# name
# Nothing

gc = geonamescache.GeonamesCache()
reference_cities = [c["name"] for c in gc.get_cities().values()]

def standardize_city(name, threshold=85):
    if not isinstance(name, str) or name.strip() == "":
        return name
    match, score = process.extractOne(name, reference_cities)
    return match if score >= threshold else name

unique_cities = pd.DataFrame(df["city"].drop_duplicates(), columns=["city"])
unique_cities["city_clean"] = unique_cities["city"].map(standardize_city)

df = df.merge(unique_cities, on="city")
df["city"] = list(map(lambda x: x if x != "New York City" else "New York", df["city_clean"]))
del df["city_clean"]

df.to_csv("CleanedData/Cleaned_Offerings.csv", index=False)