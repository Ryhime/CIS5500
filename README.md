# Integrated Travel Research Platform

## Motivation
Planning a trip typically requires juggling multiple platforms to compare hotels, 
research safety, check population density, and look up weather forecasts. This project
centralizes this process into a single web application where users can search any 
city and view comprehensive travel information in one place.

## Features
- **City Search** — Search directly by city name or browse via a Country → City cascading dropdown
- **City Overview** — View population, location, safety index, crime index, and weather forecast
- **Hotel Exploration** — Browse hotels with ratings, contact info, and metadata
- **Safety Information** — View crime and safety metrics for any city
- **Weather Integration** — Multi-day forecasts via Open-Meteo API
- **Database-Backed Queries** — Backend routes powered by SQL with filtering, joins, and aggregations

## Pages
| Page | Description |
|---|---|
| Home / Search | Search or browse cities |
| City Overview | General info and key metrics |
| Hotels | Hotels for a selected city |
| Safety | Crime and safety data |
| Reviews / Details | Hotel-level review data |

## Database Schema
**population**(`country`, `city`, population, latitude, longitude)

**offerings**(hotel_class, url, type, id, `name`, `state`, `street_address`, `postal_code`, `city`)

**city_crime_index**(rank, `city`, `country`, crime_index, safety_index)

**reviews**(title, text, author, date_stayed, offering_id, num_helpful_votes, date, `id`, service_rating, cleanliness_rating, overall_rating,
value_rating, location_rating, sleep_quality_rating, rooms_rating)

## Data Sources
- World Cities Population Dataset
- TripAdvisor Hotel Offerings & Reviews
- Numbeo Crime Index
- Open-Meteo Weather API

## Data Processing
All raw data is cleaned using Python (Pandas) before loading into PostgreSQL:
- Standardize city/country names (casing, formatting, duplicates)
- Entity resolution across datasets
- Remove duplicates and handle missing values
- Convert numeric fields (ratings, population)
- Filter irrelevant or unusable records

## Tech Stack
| Layer | Technology |
|---|---|
| Database | PostgreSQL (AWS RDS) |
| Backend | Node.js + Express |
| Frontend | React |
| Data Processing | Python / Pandas |
| Weather API | Open-Meteo |
| Tools | GitHub, pgAdmin / DataGrip |

## Directories
DataClean contains the code to clean 4 CSV files. A directory named "RawData" and a directory named "CleanedData" must be created and nested inside of DataClean prior to cleaning. The directory RawData also must be populate with the raw CSV files prior to running the cleaning code.

The backend API is in `Backend/`; copy `Backend/.env.example` to `Backend/.env` and set `PGHOST`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` for Postgres.

From `Backend/`, run `npm test` for Jest + Supertest API integration tests (they skip if those env vars are not set).

## Todo
- Add Foreign Keys and Primary Keys to the database schema
- Ensure all cities can be joined in the database
