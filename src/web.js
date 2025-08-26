import 'dotenv/config'
import express from 'express'
import { getAllCubeCards } from './db.js'

export const startWebServer = () => {
    const port = Number(process.env.WEB_PORT || null)
    if (!(port > 0)) {
        console.warn(`WEB_PORT not configured. Aborting web server.`)
        return
    }

    const app = express()
    
    app.use(express.static('public'))

    app.get('/list', (req, res) => {
        res.type('text/plain')
        res.send(getAllCubeCards().filter(card => card.voted === 1).map(card => card.card_name).join('\n'))
    })

    app.get('/json', (req, res) => {
        res.json(getAllCubeCards())
    })

    console.log(`Listening at port ${port}`)
    app.listen(port)
}