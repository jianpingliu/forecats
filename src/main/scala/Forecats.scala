package io.forecats

import akka.actor.{Actor, ActorSystem, ActorLogging}
import akka.event.LoggingAdapter
import argonaut._, Argonaut._
import com.typesafe.config.Config
import scala.util.{Success, Failure}
import spray.routing._
import spray.http.MediaTypes.{`application/json` => JSON}
import spray.http.StatusCodes
import spray.http.HttpHeaders.RawHeader

import DataTypes.Forecast

class ForecatsActor(config: Config)(implicit system: ActorSystem) 
  extends Actor
  with ActorLogging
  with ForecatsService {

  def actorRefFactory = context
  implicit def executionContext = actorRefFactory.dispatcher

  implicit val weatherUtil = new WeatherLookup(config.getConfig("forecast"), config.getConfig("cache"))
  implicit val catUtil = new CatLookup(config.getConfig("redis"))
  implicit val geoUtil = new GeoLookup(config.getConfig("maxmind"))

  def receive = runRoute(
    get {
      healthRequest ~
      weatherRequest ~
      catRequest ~
      geoRequest
    }
  )

  def healthRequest =
    path("health.html") {
      complete(StatusCodes.OK)
    }
}

trait ForecatsService extends HttpService {
  import scala.concurrent.ExecutionContext.Implicits.global

  def log: LoggingAdapter
  
  def validCoordinates(lat: Double, lng: Double) =
    (-90 <= lat && lat <= 90) && (-180 <= lng && lng <= 180)

  def weatherRequest(implicit weatherUtil: WeatherLookup) =
    path("weather" / DoubleNumber ~ "," ~ DoubleNumber) { (lat, lng) =>
      validate(validCoordinates(lat, lng), "Invalid coordinates") {
        onComplete(weatherUtil.getWeather(lat, lng)) {
          case Success(forecast) =>
            compressResponseIfRequested() {
              respondWithMediaType(JSON) {
                complete(forecast.asJson.toString)
              }
            }
          case Failure(ex) =>
            log error s"Failed to getWeather for coordinates ($lat, $lng): ${ex.getMessage}"
            complete(StatusCodes.InternalServerError)
        }
      }
    }

  def catRequest(implicit catUtil: CatLookup) =
    path("cats" / "random") {
      onComplete(catUtil.getRandom) {
        case Success(cat) => complete(cat)
        case Failure(ex) =>
          log error s"Random cat query failed: ${ex.getMessage}"
          complete(StatusCodes.NotFound)
      }
    }

  def geoRequest(implicit geoUtil: GeoLookup) =
    path("coordinates") {
      clientIP { ip =>
        geoUtil.fromIP(ip.toString) match {
          case Some((lat, lng)) if lat != 38.0 && lng != -97.0 =>
            respondWithMediaType(JSON) {
              complete(s"""{"latitude": $lat, "longitude": $lng}""")
            }
          case _ => complete(StatusCodes.NotFound)
        }
      }
    }
}
