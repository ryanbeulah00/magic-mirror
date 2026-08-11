import { useState, useEffect } from 'react';
import { fetchWeatherApi } from 'openmeteo';

// 1. Define the shape of the data based on your parsing logic
interface WeatherData {
  current: {
    time: Date;
    isDay: number;
    temperature: number;
    apparent_temperature: number;
    weather_code: number;
  };
  hourly: {
    time: Date[];
    temperature2m: Float32Array;
    apparentTemperature: Float32Array;
    precipitation: Float32Array;
    precipitationProbability: Float32Array;
    windSpeed80m: Float32Array;
  };
}

const Weather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const params = {
          latitude: 43.038669, // Milwaukee, WI
          longitude: -87.933199,
          // Added temperature_2m so the mirror has a current temp to display
          current: ["is_day", "temperature_2m","apparent_temperature", "weather_code"], 
          hourly: ["temperature_2m", "precipitation", "precipitation_probability", "wind_speed_80m"],
          models: "ncep_gfs_seamless",
          forecast_days: 7,
		  windspeed_unit: "mph",
		  temperature_unit: "fahrenheit",
		  precipitation_unit: "inch",
        };

        const url = "https://api.open-meteo.com/v1/forecast";
        const responses = await fetchWeatherApi(url, params);
        
        const response = responses[0];
        const utcOffsetSeconds = response.utcOffsetSeconds();
        const current = response.current()!;
        const hourly = response.hourly()!;

        // Note: Indices below strictly match the order in the params arrays!
        const parsedData: WeatherData = {
          current: {
            time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
            isDay: current.variables(0)!.value(),
            temperature: current.variables(1)!.value(),
            apparent_temperature: current.variables(2)!.value(),
            weather_code: current.variables(3)!.value(),
          },
          hourly: {
            time: Array.from(
              { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
              (_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
            ),
            temperature2m: hourly.variables(0)!.valuesArray()!,
            apparentTemperature: hourly.variables(1)!.valuesArray()!,
            precipitation: hourly.variables(2)!.valuesArray()!,
            precipitationProbability: hourly.variables(3)!.valuesArray()!,
            windSpeed80m: hourly.variables(4)!.valuesArray()!,
          },
        };

        setWeather(parsedData);
		// Update the last refreshed time
		const currentTime = new Date().toLocaleTimeString([], {
  			hour: 'numeric',
  			minute: '2-digit',
  			second: '2-digit'
		});
		setLastRefreshed(currentTime);
      } catch (err) {
        console.error(err);
        setError('Weather data unavailable');
      }
    };

    // Fetch immediately, then set up the 15-minute refresh interval
    loadWeather();
    const interval = setInterval(loadWeather, 900000); // 15 minutes in milliseconds
    return () => clearInterval(interval);
  }, []);

  if (error) return <>{error}</>;
  if (!weather) return <>Loading weather...</>;

  // 2. Helper function to translate WMO weather codes into text
const getWeatherDescription = (code: number): string => {
  if (code === 0) return 'Clear Skies';
  if (code === 1 || code === 2 || code === 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

  // Calculate the maximum rain probability over the next 24 hours from your hourly data
  const maxRainProb = Math.max(
    0,
    ...Array.from(weather.hourly.precipitationProbability).slice(0, 24)
  );

  return (
    <>
      <div>{Math.round(weather.current.temperature)}° {getWeatherDescription(weather.current.weather_code)}</div> 
      <div>Feels like: {Math.round(weather.current.apparent_temperature)}°</div>
      <div>Rain Chance: {Math.round(maxRainProb)}%</div>
	  {/* Debug timestamp */}
    <p style={{ fontSize: '0.8rem', color: '#666666', marginTop: '0.5rem' }}>
      Last Refreshed: {lastRefreshed}
    </p>
    </>
  );
};

export default Weather;