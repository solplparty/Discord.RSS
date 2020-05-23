const moment = require('moment-timezone')
const Supporter = require('../../../structs/db/Supporter.js')
const Schedule = require('../../../structs/db/Schedule.js')
const FailRecord = require('../../../structs/db/FailRecord.js')
const { MenuEmbed, MenuVisual, MessageVisual } = require('discord.js-prompts')
const ThemedEmbed = require('../common/utils/ThemedEmbed.js')
const LocalizedPrompt = require('../common/utils/LocalizedPrompt.js')
const Translator = require('../../../structs/Translator.js')
const handlePaginationError = require('../common/utils/handlePaginationError.js')
const getConfig = require('../../../config.js').get

/**
 * @typedef {Object} Data
 * @property {import('../../../structs/db/Profile.js')} [profile]
 * @property {import('../../../structs/db/Feed.js')[]} feeds
 * @property {string} guildID
 */

/**
 * @param {Data} data
 */
async function listFeedVisual (data) {
  const { feeds, profile, guildID } = data
  const [supporter, schedules, supporterGuilds] = await Promise.all([
    Supporter.getValidSupporterOfGuild(guildID),
    Schedule.getAll(),
    Supporter.getValidGuilds()
  ])
  const translate = Translator.createProfileTranslator(profile)
  if (feeds.length === 0) {
    return new MessageVisual(translate('commands.list.noFeeds'))
  }

  const config = getConfig()
  const failRecordsMap = {}
  const maxFeedsAllowed = supporter ? await supporter.getMaxFeeds() : config.feeds.max

  // Generate the info for each feed as an array, and push into another array
  const failRecords = await Promise.all(feeds.map(feed => FailRecord.get(feed.url)))
  const fetchedSchedules = await Promise.all(feeds.map(feed => feed.determineSchedule(schedules, supporterGuilds)))

  for (const record of failRecords) {
    if (record) {
      failRecordsMap[record._id] = record
    }
  }
  let vipDetails = ''
  if (supporter) {
    vipDetails += '**Patron Until:** '
    if (supporter.expireAt) {
      const expireAt = moment(supporter.expireAt)
      const daysLeft = Math.round(moment.duration(expireAt.diff(moment())).asDays())
      vipDetails += `${expireAt.format('D MMMM YYYY')} (${daysLeft} days)\n`
    } else {
      vipDetails += 'Ongoing\n'
    }
  } else {
    vipDetails = '\n'
  }

  const desc = maxFeedsAllowed === 0 ? `${vipDetails}\u200b\n` : `${vipDetails}**${translate('commands.list.serverLimit')}:** ${feeds.length}/${maxFeedsAllowed} [＋](https://www.patreon.com/discordrss)\n\n\u200b`
  // desc += failedFeedCount > 0 ? translate('commands.list.failAlert', { failLimit: FAIL_LIMIT, prefix: profile && profile.prefix ? profile.prefix : config.bot.prefix }) : ''

  const list = new ThemedEmbed()
    .setAuthor(translate('commands.list.currentActiveFeeds') + ` (${feeds.length})`)
    .setDescription(desc)

  if (supporter) {
    list.setFooter(`Patronage backed by ${supporter._id}`)
  }

  const menu = new MenuEmbed(list)
    .enablePagination(handlePaginationError)

  feeds.forEach((feed, i) => {
    // URL
    const url = feed.url.length > 500 ? translate('commands.list.exceeds500Characters') : feed.url

    // Title
    const title = feed.title

    // Channel
    const channel = `<#${feed.channel}>`

    // Status
    const failRecord = failRecordsMap[feed.url]
    let status = ''
    if (feed.disabled) {
      status = translate('commands.list.statusDisabled', { reason: feed.disabled })
    } else if (failRecord) {
      if (!failRecord.hasFailed()) {
        // Determine hours between config spec and now, then calculate health
        const hours = (new Date().getTime() - new Date(failRecord.failedAt).getTime()) / 36e5
        const health = `(${100 - Math.ceil(hours / FailRecord.cutoff * 100)}% health)`
        status = translate('commands.list.statusOk', { failCount: health })
      } else {
        status = translate('commands.list.statusFailed')
      }
    } else {
      status = translate('commands.list.statusOk', { failCount: '(100% health)' })
    }

    // Title checks
    const titleChecks = feed.checkTitles === true ? translate('commands.list.titleChecksEnabled') : ''

    // Webhook
    const webhook = feed.webhook ? `${translate('commands.list.webhook')}: ${feed.webhook.id}\n` : ''

    // Refresh rate
    const schedule = fetchedSchedules[i]
    let refreshRate = schedule.refreshRateMinutes < 1 ? `${schedule.refreshRateMinutes * 60} ${translate('commands.list.seconds')}` : `${schedule.refreshRateMinutes} ${translate('commands.list.minutes')}`
    // : translate('commands.list.unknown')

    // Patreon link
    if (Supporter.enabled && !supporter) {
      refreshRate += ' [－](https://www.patreon.com/discordrss)'
    }
    menu.addOption(`${title.length > 200 ? title.slice(0, 200) + '[...]' : title}`, `${titleChecks}${status}${translate('commands.list.refreshRate')}: ${refreshRate}\n${translate('generics.channelUpper')}: ${channel}\n${webhook}${translate('commands.list.link')}: ${url}`)
  })

  return new MenuVisual(menu)
}

const prompt = new LocalizedPrompt(listFeedVisual)

exports.visual = listFeedVisual
exports.prompt = prompt
