package io.forecats

import akka.actor.ActorSystem
import com.typesafe.config.Config
import scala.concurrent.Future
import scala.util.Random
import scalikejdbc._, SQLInterpolation._

class CatLookup(val config: Config)(implicit system: ActorSystem) {

  import system.dispatcher

  private val dbFile = config.getString("dbFile")
  Class.forName("org.sqlite.JDBC")
  ConnectionPool.singleton(s"jdbc:sqlite:$dbFile", null, null)

  val cats: Vector[String] = DB readOnly { implicit session =>
    sql"SELECT id FROM forecats"
      .map(rs => rs.string("id")).list.apply()
      .toVector
  }

  def getRandom: Future[String] = Future {
    cats(Random.nextInt(cats.length))
  }
}
