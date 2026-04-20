/**
 * ==========================================
 * 和风天气数据服务模块
 * 负责人：你
 * 功能：根据城市名获取实时天气和空气质量
 * ==========================================
 */

(function(global) {
    'use strict';

    // ==================== 🔑 你的和风天气密钥 ====================
    const QWEATHER_HOST = 'pa4nmuqedn.re.qweatherapi.com';
    const QWEATHER_API_KEY = 'b1e502dc06384081a047a12c69d60ddd';
    // =============================================================

    /**
     * 获取城市的天气数据
     * @param {string} cityName - 城市名称，例如 "西安"
     * @returns {Promise<Object>} 返回标准化的天气数据对象
     */
    async function fetchWeatherData(cityName) {
        if (!cityName) {
            throw new Error('城市名不能为空');
        }

        try {
            // 1. 获取城市 Location ID
            const geoUrl = `https://${QWEATHER_HOST}/geo/v2/city/lookup?location=${encodeURIComponent(cityName)}`;
            const geoResp = await fetch(geoUrl, {
                headers: { 'X-QW-Api-Key': QWEATHER_API_KEY }
            });
            const geoData = await geoResp.json();

            if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
                throw new Error(`城市查询失败: ${geoData.code || '未知错误'}`);
            }

            const locationId = geoData.location[0].id;
            const resolvedCityName = geoData.location[0].name;

            // 2. 获取实时天气
            const weatherUrl = `https://${QWEATHER_HOST}/v7/weather/now?location=${locationId}`;
            const weatherResp = await fetch(weatherUrl, {
                headers: { 'X-QW-Api-Key': QWEATHER_API_KEY }
            });
            const weatherData = await weatherResp.json();

            if (weatherData.code !== '200' || !weatherData.now) {
                throw new Error(`天气获取失败: ${weatherData.code}`);
            }

            // 3. 返回标准化数据（空气质量接口需付费，暂时返回 null）
            // 队友如需空气质量，可自行替换为高德免费 API
            return {
                city: resolvedCityName,
                updateTime: new Date().toISOString(),
                temperature: parseFloat(weatherData.now.temp),      // 温度 °C
                humidity: parseFloat(weatherData.now.humidity),     // 湿度 %
                weatherText: weatherData.now.text,                  // 天气描述
                windDir: weatherData.now.windDir,                   // 风向
                windScale: weatherData.now.windScale,               // 风力等级
                // 空气质量字段（预留，目前为空）
                aqi: null,
                aqiCategory: null,
                pm2p5: null,
                pm10: null
            };

        } catch (error) {
            console.error('和风天气服务错误:', error);
            throw error;
        }
    }

    /**
     * 获取城市天气 + 空气质量（使用高德免费 API 补充）
     * 如果队友需要空气质量数据，可以调用这个增强版函数
     * @param {string} cityName - 城市名称
     * @param {string} amapKey - 高德地图 Web 服务 AK（需队友提供）
     */
    async function fetchWeatherWithAir(cityName, amapKey) {
        // 先获取基础天气
        const baseData = await fetchWeatherData(cityName);

        // 再通过高德获取空气质量
        try {
            const airUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(cityName)}&key=${amapKey}&extensions=all`;
            const airResp = await fetch(airUrl);
            const airData = await airResp.json();

            if (airData.status === '1' && airData.forecasts && airData.forecasts[0]) {
                const cast = airData.forecasts[0].casts[0];
                baseData.aqi = parseInt(cast.aqi) || null;
                // 高德没有直接返回 aqiCategory，可根据 aqi 值自行判断
                baseData.pm2p5 = cast.daypower || null;
            }
        } catch (e) {
            console.warn('空气质量获取失败（需高德AK）:', e);
        }

        return baseData;
    }

    // ==================== 暴露给队友的接口 ====================
    const WeatherService = {
        /**
         * 【主要接口】根据城市名获取天气数据
         * 队友用法：
         * WeatherService.getWeather('西安').then(data => { console.log(data); })
         */
        getWeather: fetchWeatherData,

        /**
         * 【增强接口】获取天气 + 空气质量（需高德 AK）
         */
        getWeatherWithAir: fetchWeatherWithAir,

        /**
         * 获取版本信息
         */
        version: '1.0.0'
    };

    // 挂载到全局
    global.WeatherService = WeatherService;

    // 如果在模块系统中使用，也支持导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WeatherService;
    }

})(typeof window !== 'undefined' ? window : this);