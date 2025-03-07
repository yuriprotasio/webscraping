import { Injectable } from '@nestjs/common';
import { getGamePage } from './game-page-example';
import { getGamePageHtml } from './fixtures/game-page-html';
import * as fs from 'fs'
import { getTorrentPageHtml } from './fixtures/torrent-page-html';
import { getGamesPageHtml } from './fixtures/games-page-html';
import * as Promise from 'bluebird'

@Injectable()
export class AppService {
  async scrapAll(page) {
    const startDate = new Date()
    const gamesPageData = await fetch('https://brjogostorrent.net/page/' + page)
    const gamesPageResult = await gamesPageData.text()

    // const gamesPageResult = getGamesPageHtml();
    const gamesPageArray = gamesPageResult.split('\n')
    const allGamesUrl = await getAllGamesUrl(gamesPageArray)
    const toSaveList = []

    await Promise.map(allGamesUrl, async (gameUrl) => {
      const data = await fetch(gameUrl);
      const result = await data.text();
      // const result = getGamePageHtml();
      const resultArray = result.split('\n');
      await createImages(resultArray)
      let torrentUrl = await getTorrentUrl(resultArray)
      let otherUrl = []
      const pageTorrentUrl = getPageTorrentUrl(resultArray)
      const pageData = await fetch(pageTorrentUrl);
      const torrentPageResult = await pageData.text();
      const torrentPageArray = torrentPageResult.split('\n');

      const torrentMagnetMatch = 'magnet:'
      const torrentIndexFound = torrentUrl?.indexOf(torrentMagnetMatch)
      if (torrentIndexFound < 0 || !torrentUrl) {
        torrentUrl = ''

        const mediaFireUrl = getMediaFireUrl(torrentPageArray)
        const mediaFireMatch = 'https://www.mediafire'
        const secondMediaFireMatch = 'https://mediafire'
        const mediaFireIndexFound = mediaFireUrl?.indexOf(mediaFireMatch)
        const secondMediaFireIndexFound = mediaFireUrl?.indexOf(secondMediaFireMatch)
        if (mediaFireIndexFound > -1 || secondMediaFireIndexFound > -1) {
          console.log('Media Fire link added: ', mediaFireUrl)
          otherUrl.push({ name: 'Media Fire', url: mediaFireUrl })
        }

        const oneDriveUrl = get1drvUrl(torrentPageArray)
        const oneDriveMatch = 'https://mega'
        const secondOneDriveMatch = 'https://1drv'
        const oneDriveIndexFound = oneDriveUrl?.indexOf(oneDriveMatch)
        const secondOneDriveIndexFound = oneDriveUrl?.indexOf(secondOneDriveMatch)
        if (oneDriveIndexFound > -1 || secondOneDriveIndexFound > -1) {
          console.log('One drive link added:', oneDriveUrl)
          otherUrl.push({ name: 'One Drive', url: oneDriveUrl })
        }

        const megaUrl = getMegaUrl(torrentPageArray)
        const megaMatch = 'https://mega'
        const secondMegaMatch = 'https://www.mega'
        const megaIndexFound = megaUrl?.indexOf(megaMatch)
        const secondMegaIndexFound = megaUrl?.indexOf(secondMegaMatch)
        if (megaIndexFound > -1 || secondMegaIndexFound > -1) {
          console.log('Mega link added: ', megaUrl)
          otherUrl.push({ name: 'Mega', url: megaUrl })
        }

        const driveUrl = getDriveUrl(torrentPageArray)
        const driveMatch = 'https://drive'
        const secondDriveMatch = 'https://www.drive'
        const driveIndexFound = driveUrl?.indexOf(driveMatch)
        const secondDriveIndexFound = driveUrl?.indexOf(secondDriveMatch)
        if (driveIndexFound > -1 || secondDriveIndexFound > -1) {
          console.log('Drive link added: ', driveUrl)
          otherUrl.push({ name: 'Drive', url: driveUrl })
        }

        if (otherUrl.length < 1) {
          console.log('NOT FOUND:', getTitle(resultArray))
        }
      }

      const title = getTitle(resultArray)
      const titleId = getTitleId(resultArray)
      const sinopsis = getSinopsis(resultArray)
      const minimumRequirements = getMinimumRequirements(resultArray)
      const genresAndCategories = getGenresAndCategories(resultArray)
      const size = getSize(resultArray)
      const releaseDate = getReleaseDate(resultArray)
      const thumbName = 'Capa-' + getTitleId(resultArray) + '.jpg'
      const imageName = 'Imagem-' + getTitleId(resultArray) + '.jpg'

      const toSave = {
        title,
        titleId,
        secondaryTitle: title,
        sinopsis,
        minimumRequirements,
        createdDate: releaseDate,
        thumbnailUrl: thumbName,
        gamePictures: [imageName],
        torrentUrl,
        otherUrl,
        size,
        categories: genresAndCategories,
        genres: genresAndCategories
      }
      toSaveList.push(toSave)
    })
    // console.log('TO SAVE LIST', JSON.stringify(toSaveList))
    await fetch('http://localhost:3001/games', {
      method: "POST",
      headers: {
        'Content-Type':'application/json'
      },
      body: JSON.stringify(toSaveList)
    })

    const endDate = new Date()
    console.log('Time elapsed:', endDate - startDate + ' on page: ' + page)

    return 'Hello World!';
  }
}

function getTitle(resultArray) {
  const firstMatch = '<h1 class="elementor-heading-title elementor-size-default">';
  const lastMatch = '</h1>'
    
  let substring;
  resultArray.every((line) => {
    const indexFound = line.indexOf(firstMatch);
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.lastIndexOf(lastMatch))
      return false
    }
    return true
  });
  // const titleSubstring = resultArray.substring(
  //   resultArray.indexOf(
  //     '<h1 class="elementor-heading-title elementor-size-default">',
  //   ) + 59,
  //   resultArray.lastIndexOf('</h1>'),
  // );
  return substring;
}

function getTitleId(resultArray) {
  const firstMatch = '<meta property="og:url" content="https://brjogostorrent.net/';
  const lastMatch = '" />'
    
  let substring;
  resultArray.every((line) => {
    const indexFound = line.indexOf(firstMatch);
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.lastIndexOf(lastMatch))
      return false
    }
    return true
  });

  return substring;
}

function getSinopsis (resultArray) {
  const tempMatch = '<div class="elementor-element elementor-element-423dbfd';
  const firstMatch = '<p>'
  const lastMatch = '</p>'
    
  let substring;
  let isAbleToMatchLine = false
  resultArray.every((line) => {
    const tempIndexFound = line.indexOf(tempMatch);
    const indexFound = line.indexOf(firstMatch)

    if (isAbleToMatchLine && indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.lastIndexOf(lastMatch))
      return false
    }

    if (tempIndexFound > -1) isAbleToMatchLine = true
    return true
  });

  return '<p>' + substring + '</p>';
}

function getMinimumRequirements (resultArray) {
  const firstMatch = '<div id="elementor-tab-content-1232" class="elementor-tab-content elementor-clearfix" data-tab="2" role="tabpanel" aria-labelledby="elementor-tab-title-1232" tabindex="0" hidden="hidden">'
  const lastMatch = '</p>'
  const requirementLines = []

  let isAbleToPushRequirements = false
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch)
    const lastMatchIndexFound = line.indexOf(lastMatch)
    if (isAbleToPushRequirements) {
      requirementLines.push(line)
      if (lastMatchIndexFound > -1) return false
      return true
    }
    if (indexFound > -1) {
      const substring = line.substring(line.indexOf(firstMatch) + firstMatch.length)
      requirementLines.push(substring)
      isAbleToPushRequirements = true
    }
    return true
  })

  return requirementLines.join('')
}

function getGenresAndCategories (resultArray) {
  const firstMatch = '"articleSection":['
  const lastMatch = '],'

  let substring
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch);
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.indexOf(lastMatch, line.indexOf(firstMatch)))
      return false
    }
    return true
  })
  return '[' + substring + ']'
}

function getSize (resultArray) {
  const firstMatch = '<strong>Tamanho:</strong> '

  let substring
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch);
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length)
      return false
    }
    return true
  })
  return substring
}

function getReleaseDate (resultArray) {
  const firstMatch = '<strong>Data de lançamento:</strong> '

  let substring
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch);
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length)
      return false
    }
    return true
  })
  return substring
}

function getThumbnailUrl (resultArray) {
  const firstMatch = '<meta property="og:image" content="'
  const lastMatch = '" />'

  let substring
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch)
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.indexOf(lastMatch, line.indexOf(firstMatch)))
      return false
    }
    return true
  })
  return substring
}

function getImageUrl (resultArray) {
  const uploadsMatch = '<a href="https://brjogostorrent.net/wp-content/uploads'
  const firstMatch = 'src="'
  const lastMatch = '" class='
  let ableToLookForImage = false

  let substring
  resultArray.every(line => {
    const uploadsIndex = line.indexOf(uploadsMatch)
    const indexFound = line.indexOf(firstMatch)
    if (ableToLookForImage && indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.indexOf(lastMatch, line.indexOf(firstMatch)))
      return false
    }
    if (uploadsIndex > -1) ableToLookForImage = true
    return true
  })
  return substring
}

async function createImages (resultArray) {
  try {
    const thumbUrl = getThumbnailUrl(resultArray)
    const thumbFetch = await fetch(thumbUrl)
    const thumbBuffer = await thumbFetch.arrayBuffer()
    const thumbBase64 = await Buffer.from(thumbBuffer).toString('base64')
  
    const imageUrl = getImageUrl(resultArray)
    const imageFetch = await fetch(imageUrl)
    const imageBuffer = await imageFetch.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    if (!fs.existsSync('./images')){
      fs.mkdirSync('./images');
    }
    fs.writeFileSync('./images/Capa-' + getTitleId(resultArray) + '.jpg', thumbBase64, { encoding: 'base64' });
    fs.writeFileSync('./images/Imagem-' + getTitleId(resultArray) + '.jpg', imageBase64, { encoding: 'base64' });
  } catch (e) {
    console.log('Erro Create Images')
  }
}

async function getTorrentUrl (resultArray) {
  const pageTorrentUrl = getPageTorrentUrl(resultArray)
  if (!pageTorrentUrl) {

    console.log('resultArray', resultArray)
  }
  const data = await fetch(pageTorrentUrl);
  const torrentPageResult = await data.text();

  // const torrentPageResult = getTorrentPageHtml();
  const torrentResultArray = torrentPageResult.split('\n');
  return getMagnetUrl(torrentResultArray)
}

function getPageTorrentUrl (resultArray) {
  const firstMatch = 'href="https://brjogostorrent.net/torrent/'
  const secondaryFirstMatch = 'href="https://brjogostorrent.net/?post_type=torrent'
  const lastMatch = '" target='
  
  let substring
  resultArray.every((line) => {
    const indexFound = line.indexOf(firstMatch)
    const secondaryFirstMatchFound = line.indexOf(secondaryFirstMatch)
    let indexToUse = indexFound > -1 ? indexFound : secondaryFirstMatchFound
    if (indexToUse >= 0) {
      const nextMatch = 'href="'
      substring = line.substring(line.indexOf(nextMatch) + nextMatch.length, line.indexOf(lastMatch, line.indexOf(nextMatch)))
      return false
    }
    return true
  })
  return substring?.replaceAll('#038;', '')
}

function getMagnetUrl (resultArray) {
  const firstMatch = 'magnet:'
  const lastMatch = '" >'
  const secondaryLastMatch = '">'

  let substring
  resultArray.every(line => {
    const indexFound = line.indexOf(firstMatch)
    const lastIndexFound = line.indexOf(lastMatch)
    const secondaryLastMatchFound = line.indexOf(secondaryLastMatch)
    let lastIndexToUse = lastIndexFound > -1 ? lastIndexFound : secondaryLastMatchFound
    if (indexFound > -1) {
      substring = line.substring(line.indexOf(firstMatch), lastIndexToUse)
      return false
    }
    return true
  })
  return substring
}

function getAllGamesUrl (resultArray) {
  // return ['https://brjogostorrent.net/solar-ash-torrent-pt-br-pc-download']
  const dataElementorMatch = 'data-elementor-type="loop-item"'
  const widgetMatch = '<div class="elementor-widget-container">'
  const firstMatch = '<a href="'
  const lastMatch = '">'
  let foundDataElementorType = false
  let foundElementorWidgetContainer = false

  const list = []
  resultArray.forEach(line => {
    const elementorIndex = line.indexOf(dataElementorMatch)
    if (elementorIndex > -1) foundDataElementorType = true

    if (foundDataElementorType) {
      const widgetIndex = line.indexOf(widgetMatch)
      if (widgetIndex > -1) foundElementorWidgetContainer = true

      if (foundElementorWidgetContainer) {
        const indexFound = line.indexOf(firstMatch)
        if (indexFound > -1) {
          const substring = line.substring(line.indexOf(firstMatch) + firstMatch.length, line.indexOf(lastMatch, line.indexOf(firstMatch)))
          list.push(substring)
          foundDataElementorType = false
          foundElementorWidgetContainer = false
        }
      }
    }
  })
  return list
}

function getMediaFireUrl (resultArray) {
  const mediaFireMatch = 'mediafire'
  const firstMatch = '<a href="'
  const lastMatch = '" rel'
  let foundMediaFire = false

  let substring
  resultArray.every(line => {
    const mediaFireFound = line.indexOf(mediaFireMatch)
    if (mediaFireFound > -1) foundMediaFire = true
    if (foundMediaFire) {
      const indexFound = line.indexOf(firstMatch)
      if (indexFound > -1) {
        substring = line.substring(line.indexOf(firstMatch) + 9, line.indexOf(lastMatch))
        return false
      }
    }
    return true
  })
  return substring
}

function get1drvUrl (resultArray) {
  const oneDriveMatch = '<a href="https://1drv'
  const firstMatch = '<a href="'
  const lastMatch = '">'
  const secondaryLastMatch = '" >'
  let foundOneDrive = false

  let substring
  resultArray.every(line => {
    const oneDriveFound = line.indexOf(oneDriveMatch)
    if (oneDriveFound > -1) foundOneDrive = true
    if (foundOneDrive) {
      const indexFound = line.indexOf(firstMatch)
      const lastMatchFound = line.indexOf(lastMatch)
      const secondaryLastMatchFound = line.indexOf(secondaryLastMatch)
      let lastIndexToUse = lastMatchFound > -1 ? lastMatchFound : secondaryLastMatchFound
      if (indexFound > -1) {
        substring = line.substring(indexFound + 9, lastIndexToUse)
        return false
      }
    }
    return true
  })
  return substring
}

function getMegaUrl (resultArray) {
  const megaMatch = '<a href="https://mega'
  const firstMatch = '<a href="'
  const lastMatch = '" rel='
  const secondaryLastMatch = '" rel='
  let foundMega = false

  let substring
  resultArray.every(line => {
    const megaFound = line.indexOf(megaMatch)
    if (megaFound > -1) foundMega = true
    if (foundMega) {
      const indexFound = line.indexOf(firstMatch)
      const lastMatchFound = line.indexOf(lastMatch)
      const secondaryLastMatchFound = line.indexOf(secondaryLastMatch)
      let lastIndexToUse = lastMatchFound > -1 ? lastMatchFound : secondaryLastMatchFound
      if (indexFound > -1) {
        substring = line.substring(indexFound + 9, lastIndexToUse)
        return false
      }
    }
    return true
  })
  return substring
}

function getDriveUrl (resultArray) {
  const driveMatch = '<a href="https://drive'
  const firstMatch = '<a href="'
  const lastMatch = '" target='
  const secondaryLastMatch = '" target='
  let foundDrive = false

  let substring
  resultArray.every(line => {
    const driveFound = line.indexOf(driveMatch)
    if (driveFound > -1) foundDrive = true
    if (foundDrive) {
      const indexFound = line.indexOf(firstMatch)
      const lastMatchFound = line.indexOf(lastMatch)
      const secondaryLastMatchFound = line.indexOf(secondaryLastMatch)
      let lastIndexToUse = lastMatchFound > -1 ? lastMatchFound : secondaryLastMatchFound
      if (indexFound > -1) {
        substring = line.substring(indexFound + 9, lastIndexToUse)
        return false
      }
    }
    return true
  })
  return substring
}