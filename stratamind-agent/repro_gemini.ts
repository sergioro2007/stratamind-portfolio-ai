
import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyCMyIeVR7crFdt1idrpUSzeYb_3JsselIM";

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function testParam() {
    try {
        const model = 'gemini-2.0-flash-exp';
        const chat = ai.chats.create({ model });

        console.log("\n--- TEST 8: Introspect Response ---");
        // @ts-ignore
        const res = await chat.sendMessage({ message: "Hello" });
        console.log("Result Keys:", Object.keys(res));
        // Check prototype for getters
        const proto = Object.getPrototypeOf(res);
        console.log("Result Prototype Keys:", Object.getOwnPropertyNames(proto));

        // Check text
        // @ts-ignore
        console.log("res.text:", res.text);
        // @ts-ignore
        console.log("res.functionCalls:", res.functionCalls);
    } catch (e: any) {
        console.error("Fatal Error:", e);
    }
}

testParam();
