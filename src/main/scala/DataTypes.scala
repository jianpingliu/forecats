package io.forecats

import spray.http.HttpResponse
import spray.httpx.unmarshalling.{FromResponseUnmarshaller, MalformedContent}
import argonaut._, Argonaut._

object DataTypes {

  case class Forecast(
    summary: String,
    icon: String,
    temperature: Int,
    apparentTemperature: Int,
    temperatureMin: Int,
    temperatureMax: Int
  )

  implicit def forecastDecodeJson = DecodeJson[Forecast](c =>
    for {
      summary <- (c --\ "currently" --\ "summary").as[String]
      icon <- (c --\ "currently" --\ "icon").as[String]
      temperature <- (c --\ "currently" --\ "temperature").as[Int]
      apparentTemperature <- (c --\ "currently" --\ "apparentTemperature").as[Int]
      temperatureMin <- ((c --\ "daily" --\ "data" =\ 0) --\ "temperatureMin").as[Int]
      temperatureMax <- ((c --\ "daily" --\ "data" =\ 0) --\ "temperatureMax").as[Int]
    } yield Forecast(summary.toLowerCase, icon, temperature, apparentTemperature, temperatureMin, temperatureMax)
  )

  implicit def forecastEncodeJson = EncodeJson[Forecast](
    (f: Forecast) => ("summary" := f.summary)
      ->: ("icon" := f.icon)
      ->: ("temperature" := f.temperature)
      ->: ("apparentTemperature" := f.apparentTemperature)
      ->: ("temperatureMin" := f.temperatureMin)
      ->: ("temperatureMax" := f.temperatureMax)
      ->: jEmptyObject
  )

  implicit val forecastUnmarshaller = new FromResponseUnmarshaller[Forecast] {
    def apply(response: HttpResponse) = {
      Parse.decodeOption[Forecast](response.entity.asString) match {
        case Some(forecast) => Right(forecast)
        case None => Left(MalformedContent("Could not unmarshal Forecast"))
      }
    }
  }
}
