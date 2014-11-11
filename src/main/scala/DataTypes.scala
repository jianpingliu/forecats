package io.forecats

import spray.http.HttpResponse
import spray.httpx.unmarshalling.{FromResponseUnmarshaller, MalformedContent}
import argonaut._, Argonaut._

object DataTypes extends WeatherTypes {

  case class Forecast(
    currently: CurrentWeather,
    hourly: List[HourlyWeather],
    daily: List[DailyWeather]
  )

  implicit def currentWeatherCodec = casecodec4(CurrentWeather.apply, CurrentWeather.unapply)("icon", "summary", "temperature", "apparentTemperature")
  implicit def dailyWeatherCodec = casecodec5(DailyWeather.apply, DailyWeather.unapply)("time", "icon", "summary", "temperatureMin", "temperatureMax")
  implicit def hourlyWeatherCodec = casecodec4(HourlyWeather.apply, HourlyWeather.unapply)("time", "icon", "summary", "temperature")

  implicit def forecastDecoder = DecodeJson[Forecast](c => {
    for {
      currently <- (c --\ "currently").as[CurrentWeather]
      hourly <- (c --\ "hourly" --\ "data").as[List[HourlyWeather]]
      daily <- (c --\ "daily" --\ "data").as[List[DailyWeather]]
    } yield Forecast(currently, hourly.take(5), daily.take(5))
  })

  implicit def forecastEncoder = EncodeJson[Forecast](
    (f: Forecast) => ("currently" := f.currently)
      ->: ("hourly" := f.hourly)
      ->: ("daily" := f.daily)
      ->: jEmptyObject
  )

  implicit val forecastUnmarshaller = new FromResponseUnmarshaller[Forecast] {
    def apply(response: HttpResponse) = {
      Parse.decodeOption[Forecast](response.entity.asString) match {
        case Some(forecast) => Right(forecast)
        case None => Left(MalformedContent("Failed to unmarshal Forecast"))
      }
    }
  }
}

trait WeatherTypes {
  case class CurrentWeather(
    icon: String,
    summary: String,
    temperature: Int,
    apparentTemperature: Int
  )

  case class HourlyWeather(
    time: Long,
    icon: String,
    summary: String,
    temperature: Int
  )

  case class DailyWeather(
    time: Long,
    icon: String,
    summary: String,
    temperatureMin: Int,
    temperatureMax: Int
  )
}
