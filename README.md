# Integrated Travel Research Platform

## Motivation
Planning a trip typically requires juggling multiple platforms to compare hotels, 
research safety, check population density, and look up weather forecasts. This project
centralizes this process into a single web application where users can search any 
city and view comprehensive travel information in one place.

## Features
- **City Search** — Browse supported cities via dropdown
- **City Overview** — View population, location, safety index, crime index, and weather forecast
- **Hotel Exploration** — Search/filter hotels with ratings and metadata
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
This project uses the following tables (PostgreSQL).

**`city_crime_index`**
- `city` (PK, varchar(50))
- `crime_index` (double precision)

**`population`**
- `city` (PK, varchar(100), FK → `city_crime_index.city`)
- `population` (numeric(10, 1))
- `latitude` (numeric(10, 6))
- `longitude` (numeric(10, 6))

**`offerings`**
- `id` (PK, integer)
- `name` (varchar(255))
- `city` (varchar(100), FK → `population.city`)
- `street_address` (varchar(255))
- `type` (varchar(50))
- `hotel_class` (numeric(2, 1))
- `url` (varchar(500))

**`reviews`**
- `id` (PK, bigint)
- `offering_id` (integer, FK → `offerings.id`)
- `title` (varchar(255))
- `text` (varchar(5000))
- `author` (varchar(100))
- `date_stayed` (varchar(50))
- `num_helpful_votes` (integer)
- `date` (varchar(50))
- ratings: `overall_rating`, `cleanliness_rating`, `service_rating`, `value_rating`, `location_rating`, `sleep_quality_rating`, `rooms_rating` (numeric(2, 1))

**Derived metrics used in queries**
- **Safety index** is computed as \(100 - crime_index\) (not stored as a column).

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

## Testing (Single Source of Truth)

Run all tests from this section.

### Backend tests (`Backend/`)
- `npm install`
- `npm test` — integration tests with env-aware behavior
- `npm run test:integration` — API integration suite (`api.spec.js`)
- `npm run test:real-data` — real DB/data integration suite (`real-data.spec.js`)

### Frontend tests (`frontend/`)
- `npm install`
- `npm run test` — runs all Vitest tests
- `npm run test:watch` — watch mode during development


## Todo
- Add performance indexes for common joins/aggregations (e.g., `reviews(offering_id)`, `offerings(city)`).
