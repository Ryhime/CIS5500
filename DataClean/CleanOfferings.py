import pandas as pd

df = pd.read_csv("RawData/offerings.csv")

del df["id"]


infos = df["address"]