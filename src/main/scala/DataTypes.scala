package io.forecats

import spray.http.HttpResponse
import spray.httpx.unmarshalling.{FromResponseUnmarshaller, MalformedContent}
import spray.json.DefaultJsonProtocol
import spray.json.lenses.JsonLenses._

object DataTypes extends DefaultJsonProtocol {

  case class Forecast(
    summary: String,
    icon: String,
    temperature: Double,
    apparentTemperature: Double
  )

  implicit def forecastFormat = jsonFormat4(Forecast)

  implicit val forecastUnmarshaller = new FromResponseUnmarshaller[Forecast] {
    def apply(response: HttpResponse) = try {
      Right(response.entity.asString.extract[Forecast]('currently))
    } catch { case x: Throwable =>
      Left(MalformedContent("Could not unmarshal Forecast", x))
    }
  }
}
