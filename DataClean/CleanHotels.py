import pandas as pd

df = pd.read_csv("RawData/hotels.csv", encoding='latin1')

del df["countyCode"]
del df[" cityCode"]
del df[" HotelCode"]
del df[" FaxNumber"]
del df[" PinCode"]


spaces_to_remove = [
    " cityName", " HotelName", " Address", " Description", " HotelFacilities", " Map", " PhoneNumber", " HotelWebsiteUrl"
]

for n in spaces_to_remove:
    df[n[1::]] = df[n]
    del df[n]
    
df["CountryName"] = df[" countyName"]
del df[" countyName"]


# Hotel rating out of 5 stars
mp = {
    "OneStar" : 1,
    "TwoStar" : 2,
    "ThreeStar" : 3,
    "FourStar" : 4,
    "All" : 5,
    "FiveStar" : 5
}

df["HotelRating"] = list(map(lambda x: mp[x], list(df[" HotelRating"])))
del df[" HotelRating"]

df["Attractions"] = list(map(lambda x: "None" if pd.isna(x) or x == "NaN" else x, list(df[" Attractions"])))
del df[" Attractions"]

df.to_csv("CleanedData/Cleaned_Hotels.csv", index=False)

df = pd.read_csv("CleanedData/Cleaned_Hotels.csv")

print(df.iloc[0])