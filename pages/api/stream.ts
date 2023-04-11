import type { NextRequest } from "next/server";
// import { ChatGPTMessage, OpenAIStream, OpenAIStreamPayload } from "./OpenAIStream";
import { ChatGPTMessage, OpenAIStream, OpenAIStreamPayload } from "./OpenAIStream";
const axios = require("axios");

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  
  const { prompt, key, user_id,
    token,device } = (await req.json()) as {
      prompt?: Array<ChatGPTMessage>;
      key?: string;
      user_id?: string;
      token?: string;
      device?: string;
    };
  if (key !== "lian") {
    return new Response();
  }
  if (!prompt) {
    return new Response("No prompt in the request", { status: 400 });
  }



  const body = {
    user_id,
    token,
    prompt,
    device
  }
  const response: any = await fetch("https://www.chuanxi.fun/api/chat/user",
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  const user: any = await response.json();
  if (user.code == -1) {
    return new Response(JSON.stringify(user), { status: 200 });
  }else if(user.code == 1){
    // user.code = 0
    return new Response(user.data, { status: 200 });
  }
  const payload: OpenAIStreamPayload = {
    // model: "text-davinci-003",
    model: "gpt-3.5-turbo",
    messages: user.data.prompt,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    // max_tokens: 4096,
    stream: true,
    n: 1,
  };
  user.data.device = device

  const { stream, answer } = await OpenAIStream(payload, user.data);

  // await fetch("https://www.chuanxi.fun/api/chat/user",
  // {
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   method: "POST",
  //   body: JSON.stringify(user),
  // }
  // );
  return new Response(stream);
  // return res;
  // return response;
};

export default handler;
