import { fetchWeatherApi } from "openmeteo";

const params = {
  latitude: 43.038669, // Milwaukee, WI
  longitude: -87.933199,
  hourly: ["temperature_2m", "apparent_temperature", "precipitation", "precipitation_probability", "wind_speed_80m"],
  models:"ncep_gfs_seamless",
  current: "is_day",
  forecast_days: 7,
};

const url = "https://api.open-meteo.com/v1/forecast";
const responses = await fetchWeatherApi(url, params);

// Process first location. Add a for-loop for multiple locations or weather models
const response = responses[0];

// Attributes for timezone and location
const latitude = response.latitude();
const longitude = response.longitude();
const elevation = response.elevation();
const utcOffsetSeconds = response.utcOffsetSeconds();

console.log(
	`\nCoordinates: ${latitude}°N ${longitude}°E`,
	`\nElevation: ${elevation}m asl`,
	`\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`,
);

const current = response.current()!;
const hourly = response.hourly()!;

// Note: The order of weather variables in the URL query and the indices below need to match!
const weatherData = {
	current: {
		time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
		is_day: current.variables(0)!.value(),
	},
	hourly: {
		time: Array.from(
			{ length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
			(_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
		),
		temperature_2m: hourly.variables(0)!.valuesArray(),
		apparent_temperature: hourly.variables(1)!.valuesArray(),
		precipitation: hourly.variables(2)!.valuesArray(),
		precipitation_probability: hourly.variables(3)!.valuesArray(),
		wind_speed_80m: hourly.variables(4)!.valuesArray(),
	},
};

// The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information
console.log(
	`\nCurrent time: ${weatherData.current.time}\n`,
	weatherData.current.is_day,
);
console.log("\nHourly data:\n", weatherData.hourly)