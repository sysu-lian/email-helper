import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";


export type ChatGPTAgent = "user" | "system";

export interface ChatGPTMessage {
  role: ChatGPTAgent;
  content: string;
}
export interface OpenAIStreamPayload {
  model: string;
  temperature: number;
  messages: ChatGPTMessage[]
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  // max_tokens: number;
  stream: boolean;
  n: number;
}

export async function OpenAIStream(payload: OpenAIStreamPayload,user:any) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let counter = 0;
  let answer = ""; // initialize answer variable


  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjNlODY0N2RiYTEzODI0YjQxY2YwNTA5IiwidXNlcl9uYW1lIjoi5a2m6L6-IiwicmVkaXNfa2V5IjoiNjNlODY0N2RiYTEzODI0YjQxY2YwNTA5IiwibG9naW5fdGltZSI6IjIwMjMtMDQtMTFUMDk6MzQ6MDEuODU2WiIsImlhdCI6MTY4MTIwNTY0MSwiZXhwIjoxNjgxMzc4NDQxfQ.jAHFsTyewmnST8DaYRoiKqKJc4fVu8h5O0HXAI7Xb90"}`,
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === "event") {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {

            const response: any = fetch("https://www.chuanxi.fun/api/chat/save-answer",
              {
                headers: {
                  "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ answer,user }),
              }
            );
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            // const text = json.choices[0].text;
            const text = json.choices[0].delta?.content || "";
            if (counter < 2 && (text.match(/\n/) || []).length) {
              // this is a prefix character (i.e., "\n\n"), do nothing
              return;
            }
            answer += text; // append text to answer variable
            const queue = encoder.encode(text);
            controller.enqueue(queue);
            counter++;
          } catch (e) {
            // maybe parse error
            controller.error(e);
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse);
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        // answer += chunk;
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return { stream, answer };
}
