const { DiscordPrompt, MessageVisual } = require('discord.js-prompts')
const Translator = require('../../../structs/Translator.js')

/**
 * @typedef {Object} Data
 * @property {import('../../../structs/db/Profile.js')} [profile]
 * @property {import('../../../structs/db/Feed.js')[]} feeds
 * @property {import('../../../structs/db/Feed.js')} selectedFeed
 */

/**
 * @param {Data} data
 */
function removeDirectSuccess (data) {
  const { profile, selectedFeed: feed } = data
  const translate = Translator.createProfileTranslator(profile)
  // Newly added
  return new MessageVisual(translate('commands.unsub.directRemoveSuccess', {
    link: feed.url
  }))
}

const prompt = new DiscordPrompt(removeDirectSuccess)

exports.prompt = prompt
