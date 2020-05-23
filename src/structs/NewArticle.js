const ArticleMessage = require('./ArticleMessage.js')
const Feed = require('./db/Feed.js')
const FeedData = require('./FeedData.js')

class NewArticle {
  /**
   * @param {Object<string, any>} article
   * @param {Object<string, any>|import('./db/Feed.js')} feedObject
   */
  constructor (article, feedObject) {
    this.article = article
    this.feedObject = feedObject
  }

  toJSON () {
    return {
      article: this.article,
      feedObject: this.feedObject
    }
  }

  async getArticleMessage (bot, debug) {
    const feedObject = this.feedObject
    const feed = feedObject instanceof Feed ? feedObject : new Feed(feedObject)
    const feedData = await FeedData.ofFeed(feed)
    const articleMessage = new ArticleMessage(bot, this.article, feedData, debug)
    return articleMessage
  }
}

module.exports = NewArticle
