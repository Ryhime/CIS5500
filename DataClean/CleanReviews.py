import pandas as pd
import json
import ast

df = pd.read_csv("RawData/reviews.csv", sep=",")

# ratings
jsons = list(map(lambda x: json.loads(x.replace("'", '"')), df["ratings"]))

df["service_rating"] = list(map(lambda x: x["service"] if "service" in x else "", jsons))
df["cleanliness_rating"] = list(map(lambda x: x["cleanliness"] if "cleanliness" in x else "", jsons))
df["overall_rating"] = list(map(lambda x: x["overall"] if "overall" in x else "", jsons))
df["value_rating"] = list(map(lambda x: x["value"] if "value" in x else "", jsons))
df["location_rating"] = list(map(lambda x: x["location"] if "location" in x else "", jsons))
df["sleep_quality_rating"] = list(map(lambda x: x["sleep_quality"] if "sleep_quality" in x else "", jsons))
df["rooms_rating"] = list(map(lambda x: x["rooms"] if "rooms" in x else "", jsons))

del df["ratings"]

# title
# Nothing

# text
# Nothing

# author
print(df["author"])
jsons = list(map(lambda x: ast.literal_eval(x), df["author"]))
df["author"] = list(map(lambda x: x["username"], jsons))

# date_stayed
# Nothing

# offering_id
# Nothing

# num_helpful_votes
# Nothing

# date
# Nothing

# id
# Nothing

# via_mobile
del df["via_mobile"]

df.to_csv("CleanedData/Cleaned_Reviews.csv", index=False)
