import 'dotenv/config'
import { consumeMessage } from './consumer'

const worker = async () => {
  await consumeMessage()
}

worker()
