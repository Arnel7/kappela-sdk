import type { HttpClient } from '../http.js'
import { buildMediaForm } from '../http.js'
import type {
  SendMessageParams,
  SendPhotoParams,
  SendVideoParams,
  SendDocumentParams,
  SendAudioParams,
  SendCarouselParams,
  SendTypingParams,
  DeleteMessageParams,
  EditMessageParams,
  SendResult,
  SendMediaResult,
  SendCarouselResult,
  TypingResult,
  DeleteResult,
  EditMessageResult,
} from '../types.js'

export class MessagesResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Send a text message, with optional buttons. */
  send(params: SendMessageParams): Promise<SendResult> {
    return this.http.post(`${this.base}/sendMessage`, params)
  }

  /** Send a photo (image file). */
  sendPhoto(params: SendPhotoParams): Promise<SendMediaResult> {
    return this.http.postForm(`${this.base}/sendPhoto`, () =>
      buildMediaForm('photo', params.chat_id, params.photo, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a video file. */
  sendVideo(params: SendVideoParams): Promise<SendMediaResult> {
    return this.http.postForm(`${this.base}/sendVideo`, () =>
      buildMediaForm('video', params.chat_id, params.video, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a document / file. */
  sendDocument(params: SendDocumentParams): Promise<SendMediaResult> {
    return this.http.postForm(`${this.base}/sendDocument`, () =>
      buildMediaForm('document', params.chat_id, params.document, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send an audio file. */
  sendAudio(params: SendAudioParams): Promise<SendMediaResult> {
    return this.http.postForm(`${this.base}/sendAudio`, () =>
      buildMediaForm('audio', params.chat_id, params.audio, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a product/card carousel. */
  sendCarousel(params: SendCarouselParams): Promise<SendCarouselResult> {
    return this.http.post(`${this.base}/sendCarousel`, params)
  }

  /** Show or hide the typing indicator in a chat. */
  sendTyping(params: SendTypingParams): Promise<TypingResult> {
    return this.http.post(`${this.base}/sendTyping`, {
      chat_id:   params.chat_id,
      is_typing: params.is_typing ?? true,
    })
  }

  /** Edit the text or inline keyboard of a message sent by this bot/user. */
  edit(params: EditMessageParams): Promise<EditMessageResult> {
    return this.http.post(`${this.base}/editMessage`, params)
  }

  /** Delete a message sent by this bot/user. */
  delete(params: DeleteMessageParams): Promise<DeleteResult> {
    return this.http.post(`${this.base}/deleteMessage`, params)
  }
}
