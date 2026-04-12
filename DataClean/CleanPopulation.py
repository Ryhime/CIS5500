import pandas as pd
import country_converter as coco
import string

cc = coco.CountryConverter()

df = pd.read_csv("RawData/worldcitiespop.csv")

df["Country"] = cc.convert(names=df["Country"], to="name_short")
df["City"] = list(map(lambda x: string.capwords(x) if type(x) is str else x, list(df["City"])))
del df["AccentCity"]

del df["Region"]

df.to_csv("CleanedData/Cleaned_Population.csv", index=False)