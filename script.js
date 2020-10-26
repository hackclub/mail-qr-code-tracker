const appUrl = 'https://hackclub-mail-services.herokuapp.com/'

var body
var descriptionWrapper
var fileInput
var fileLabel

const setDescriptionText = text => {
  console.log('Setting description text', text)
  descriptionWrapper.selectAll('descriptionText')
    .data(text)
    .enter()
    .append('descriptionText')
      .text(function(d, i){return d})
    .exit()
      .remove()
}

const getUrlParams = url => {
  console.log('Getting params from url '+url)
  const queryString = url.split('?')[1]

  if (!queryString) return null

  const paramStrings = queryString.split('&')

  if (!paramStrings) return null

  const paramPairs = _.map(paramStrings, v => v.split('='))
  const params = _.fromPairs(paramPairs)

  // Add any addition params we want to destructure here
  const {
    m,
    t = 'e'
  } = params

  const mission = m
  const type = t == 'e' ? 'external' : 'internal'

  if (!mission) return null
  
  return {
    queryString,
    missionRecordId: mission,
    scanType: type
  }
}

const loadPage = async () => {
  body = d3.select('body')
  descriptionWrapper = body.append('descriptionWrapper')
  
  var url = decodeURI(window.location.href)

  // Default test URL
  if (!url.includes('?'))
    url = 'https://mail-qr-code-tracker.polytrope.repl.co/?t=i&m=recIAQe93zd19NY5f'

  // window.history.replaceState({page: 0}, 'Scanning Package', '?'+url.split('?')[1])

  console.log('URL is '+url)

  const {
    queryString,
    missionRecordId,
    scanType
  } = getUrlParams(url)

  const statusText = body.select('status')
  
  // statusText.text('getting package status...')

  console.log('Requesting package status from server…')

  const requestBody = {
    missionRecordId,
    scanType
  }
  console.log(requestBody)

  const packageStatus = await (await fetch(appUrl+'scan', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json'
    }
  })).json()

  const {
    scannedInternal,
    scannedExternal,
    receiverName,
    senderName,
    receiverPhotoUrl,
    trackingUrl,
    scenarioName,
  } = packageStatus

  console.log('Got response from server:')
  console.log(packageStatus)

  if (scanType == 'receipt') {

  }
  else if (scanType == 'internal') {
    console.log('Internal scan')

    if (receiverPhotoUrl) {
      console.log('Already scanned')
      statusText.text(`Complete!`)
      setDescriptionText([
        `Enjoy your ${scenarioName} from ${senderName}`
      ])
    }
    else {
      console.log('Not already scanned')

      statusText.text(`Hello!`)

/*
      setDescriptionText([
        `Post a photo of this package in`,
        `the #packages channel on Slack!`
      ])
*/
      setDescriptionText([
        `Take a photo of your package`,
        `so we know you received it!`,
        `This will post to our #packages`,
        `channel, so cover any personal info.`,
      ])
      
      fileInput = body.append('input')
          .attr('type', 'file')
          .attr('accept', 'image/*')
          .attr('capture', 'environment')
          .attr('name', 'file')
          .attr('id', 'file')

      fileLabel = body.append('label')
          .attr('for', 'file')
          .text('Photo')

      fileInput.node().addEventListener('change', async e => {
        console.log('Sending photo to mail services server')

        const fileData = e.target.files[0]
        console.log('File Received:', fileData)

        const fileType = 'png'
        const fileName = missionRecordId+'.'+fileType

        console.log('Creating form data')

        const form = new FormData()

        form.append('missionRecordId', missionRecordId)
        form.append('fileType', fileType)
        form.append('type', 'receiver')
        form.append('photo', fileData, {
            filename: fileName+'.'+fileType
        })

        console.log('Form created')

        const photoResponse = await (await fetch(appUrl+'photo-receipt', {
          method: 'POST',
          body: form
        })).json()

        statusText.text('Complete!')
        setDescriptionText(['Thanks, you are all set!'])

        console.log('Form submitted')
      })
    }
  }
  else {
    console.log('External scan')
    
    if (scannedExternal) {
      console.log('Already scanned')

      const descriptionStrings = [
        `This package from ${senderName} was already`,
        `scanned for shipment to ${receiverName}!`
      ]

      if (trackingUrl) {
        body.append('a')
            .attr('href', trackingUrl)
            .attr('class', 'link')
            .text('Track this package')
      }
      else {
        descriptionStrings.push('This package is not tracked.')
      }

      statusText.text('Ready!')
      setDescriptionText(descriptionStrings)
    }
    else {
      console.log('Not scanned yet')

      statusText.text('Ready!')
      setDescriptionText([
        `Thanks! I've marked this package from`,
        `${senderName} to ${receiverName} as scanned.`
      ])
    }
  }
}

window.addEventListener('load', loadPage)