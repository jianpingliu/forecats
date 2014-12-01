package io.forecats

import akka.actor.{Actor, ActorSystem, ActorLogging}
import akka.event.LoggingAdapter
import argonaut._, Argonaut._
import com.typesafe.config.Config
import scala.util.{Success, Failure}
import spray.routing._
import spray.http.MediaTypes.{`application/json` => JSON}
import spray.http.StatusCodes

class ForecatsActor(config: Config)(implicit system: ActorSystem) 
  extends Actor
  with ActorLogging
  with ForecatsService {

  def actorRefFactory = context
  implicit def executionContext = actorRefFactory.dispatcher

  val weatherUtil = new WeatherLookup(config.getConfig("forecast"))
  val catUtil = new CatLookup(config.getConfig("redis"))

  def receive = runRoute {
    get {
      weatherRequest ~
      catRequest
    }
  }
}

trait ForecatsService extends HttpService {

  import scala.concurrent.ExecutionContext.Implicits.global
  import DataTypes.Forecast

  def log: LoggingAdapter

  val weatherUtil: WeatherLookup
  val catUtil: CatLookup

  def weatherRequest =
    path("weather" / DoubleNumber ~ "," ~ DoubleNumber) { (lat, lng) =>
      if(validCoordinates(lat, lng)) {
        weatherFromCoordinates(lat, lng)
      }
      else complete(StatusCodes.BadRequest)
    }

  def validCoordinates(lat: Double, lng: Double) =
    (-90 <= lat && lat <= 90) && (-180 <= lng && lng <= 180)

  def weatherFromCoordinates(lat: Double, lng: Double) =
    onComplete(weatherUtil.getWeather(lat, lng)) {
      case Success(forecast) => completeWithJson(forecast)
      case Failure(ex) =>
        log error s"weather lookup for coordinates ($lat,$lng) failed: ${ex.getMessage}"
        complete(StatusCodes.InternalServerError)
    }

  def completeWithJson(forecast: Forecast) =
    respondWithMediaType(JSON) {
      complete(forecast.asJson.toString)
    }

  def catRequest = 
    path("cats" / "random") {
      onComplete(catUtil.getRandom) {
        case Success(cat) => complete(cat)
        case Failure(ex) =>
          log error s"random cat query failed: ${ex.getMessage}"
          complete(StatusCodes.NotFound)
      }
    }
}
