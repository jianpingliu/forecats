package io.forecats

import akka.actor.ActorSystem
import com.typesafe.config.Config
import scala.concurrent.{Future, Promise}
import com.redis.RedisClient

class CatLookup(val config: Config)(implicit system: ActorSystem) {

  import system.dispatcher

  private val r = new RedisClient(
    config.getString("host"),
    config.getInt("port")
  )

  private val cats = config.getString("set")

  def randomFromSet(set: String) = {
    val p = Promise[String]()
    Future {
      r.srandmember(set) match {
        case Some(cat) => p.success(cat)
        case None => p.failure(new Exception(s"empty set $set"))
      }
    }

    p.future
  }

  def getRandom = randomFromSet(cats)
}
