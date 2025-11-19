import {
    convertToModelMessages, generateText,
    streamText, tool, stepCountIs,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import Prisma from '@/services/prisma';

const aiModelName = 'gpt-5-nano'; // Valid OpenAI model
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define the tool with Zod schema directly

const AiTools = {
    logToConsole: tool({
        description: 'Log a message to the console',
        inputSchema: z.object({
            message: z
                .string()
                .describe('The message to log to the console'),
        }),
        execute: ({ message }) => {
            console.log('=======  TOOL: logToConsoleTool ====== ');
            console.log(message);
            console.log('');

            return message;
        },
    }),
    addressCheckerTool: tool({
        description: 'Check if the service is available for a given address',
        inputSchema: z.object({
            zipCode: z
                .string()
                .describe('The full address to check service availability'),
        }),
        execute: ({ zipCode }) => {
            const supportedZipCodes = ['10001', '10002', '10003', '0057']; // Example supported zip codes
            let isSupported = false;
            for (const code of supportedZipCodes) {
                if (zipCode.includes(code)) {
                    isSupported = true;
                    break;
                }
            }

            const result = {
                isSupported: isSupported
            };

            console.log('=======  TOOL: addressCheckerTool ====== ');
            console.log(zipCode);
            console.log(result);
            console.log('');

            return result;
            return isSupported ? `Yes, we support services at ${address}.` : `Sorry, we do not support services at ${address}.`;
        },
    }),
    dbRequestTool: tool({
        description: 'Query the products database',
        inputSchema: z.object({
            where: z.string("")
                .describe('parsable, JS/JSON object representing Prisma where object to find leads from the postgres database'),
            limit: z
                .number()
                .min(1)
                .max(100)
                .default(20)
                .describe('Maximum number of records to return'),
        }),
        execute: async ({ where, limit }) => {
            try {
                console.log('=======  TOOL START: dbRequestTool ======');
                console.log('args: ', { where, limit });


                let result = null;
                let whereObj = null;
                try {
                    whereObj = where ? JSON.parse(where) : {};
                } catch (error) {
                    console.error('DB Request Tool: Error parsing "where" parameter:', error?.message || error);
                }


                if (where && !whereObj) {
                    console.error('DB Request Tool: "where" parameter is invalid JSON. Returning null.');
                    return null;
                }

                // if (!whereObj || Object.keys(whereObj).length === 0) {
                //     console.log('DB Request Tool: "where" parameter is empty. Returning empty array.');
                //     return result;
                // }
                // console.log('whereObj: ', whereObj);

                let prismaObj = {};
                if (limit) {
                    prismaObj.take = limit;
                }
                if (whereObj && Object.keys(whereObj).length > 0) {
                    prismaObj.where = whereObj;
                }

                result = Prisma.leads.findMany(prismaObj);

                return result;

            } catch (error) {
                console.error('DB Request Tool Error:', error?.message || error);
                return error?.message || 'error getting data';
            }
        },
    }),
}


export default async function HandleAiRequest(req) {
    try {
        const { messages } = await req.json();

        const result = streamText({
            model: openai(aiModelName),
            messages: convertToModelMessages(messages),
            tools: AiTools,
            system:
                `if user ask or you feel you need to get data on leads use the dbRequestTool to query the leads database.`
                + `if tools return no data, null or empty array use it to form your response.`
                + `if valid data is returned from the tool, use it to form your response.`
                + `if asked about pipline it means lead stages: lead, pendingApp, screening, preQualified, preApproval, active, pastClients, other.`
            ,
            // maxSteps: 6,
            stopWhen: stepCountIs(10),//to allow multiple tool calls then response
            // onFinish({ text, finishReason, usage, response, steps, totalUsage }) {
            //     // your own logic, e.g. for saving the chat history or recording usage
            //     const messages = response.messages; // messages that were generated
            // },
        });

        // console.log('result steps:', await result?.steps);

        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error('Error handling AI request:', error?.message || error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });

    }
}


export const processMessages = async (messages) => {
    try {
        const aiResponse = await generateText({
            model: openai(aiModelName),
            messages: messages,
            tools: AiTools,
            stopWhen: stepCountIs(10),//to allow multiple tool calls then response
            system:
                'your a constructional company AI assistant.'
                + 'use tools when needed to answer user questions.'
            // `if user ask or you feel you need to get data on leads use the dbRequestTool to query the leads database.`
            // + `if tools return no data, null or empty array use it to form your response.`
            // + `if valid data is returned from the tool, use it to form your response.`
            // + `if asked about pipline it means lead stages: lead, pendingApp, screening, preQualified, preApproval, active, pastClients, other.`
            ,
        });

        console.log('processMessages: ', aiResponse.content);



        return aiResponse;
        // // Parse the text response as JSON
        // try {
        //     const jsonResponse = JSON.parse(aiResponse.text);
        //     return jsonResponse;
        // } catch (parseError) {
        //     // If parsing fails, return the text response
        //     console.warn('Could not parse AI response as JSON:', aiResponse.text);
        //     return { text: aiResponse.text };
        // }

    } catch (error) {
        console.error('processMessages error: ', error);
        return null;
    }
}


export const fetchFromOpenAI = async (messages, options = {}) => {
    if (!messages || messages.length === 0) {
        return { success: false, error: 'Messages array is empty' };
    }

    // console.log('messages:', messages);

    const {
        model = aiModelName,
        // temperature = 0.7,
        // max_tokens = 1024,
        stream = false,            // set true if you want streaming later
        ...extra
    } = options;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages,
                // temperature,
                // max_tokens,
                stream,                 // keep false for simple response
                ...extra,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI error ${response.status}: ${err}`);
        }

        const data = await response.json();

        // Normal (non-streaming) response
        const content = data.choices?.[0]?.message?.content?.trim() || '';

        return {
            success: true,
            content,
            usage: data.usage,
            fullResponse: data,   // optional: expose everything
        };

    } catch (error) {
        console.error('fetchFromOpenAI error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error',
        };
    }
};