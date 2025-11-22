import {
    convertToModelMessages, generateText,
    streamText, tool, stepCountIs,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import Prisma from '@/services/prisma';
import { ghlCreateOpportunity, ghlDeleteOpportunity, ghlGetCalendarSlots, ghlGetTokens, ghlUpdateOpportunity, ghlCreateAppointment, ghlUpdateAppointment, ghlDeleteAppointment, ghlGetCalendarEvents, ghlGetContacts } from '@/services/ghl';
import { da } from 'zod/v4/locales';

const aiModelName = 'gpt-5-mini'; // Valid OpenAI model
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create OpenAI instance with API key
const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
});

// Define the tool with Zod schema directly

export const AiTools = {
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
            const supportedZipCodes = ['SE2', '10002', '10003', '0057']; // Example supported zip codes
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
    estimateTool: tool({
        description: 'Estimate project cost based on area in square feet',
        inputSchema: z.object({
            formData: z.object({
                full_name: z.string(),
                email: z.string(),
                phone: z.string(),
                is_business_quote: z.boolean().default(false),
                company_name: z.string().default(''),
                project_address: z.string().default(''),
                has_sales_rep: z.boolean().default(false),
                sales_rep_email: z.string().default(''),
                timeframe: z.string().default(''),
                material_choice: z.string().default(''),
                engineered_wood_install_type: z.string().nullable().default(null),
                lvt_install_type: z.string().nullable().default(null),
                solid_wood_install_type: z.string().nullable().default(null),
                pattern_choice: z.string().default(''),
                tonality: z.number().default(50),
                price_range: z.string().default(''),
                manual_price: z.string().default(''),
                rooms: z.array(z.any()).default([]),
                total_area: z.string().default(''),
                uplift_required: z.boolean().default(false),
                flooring_types: z.array(z.string()).default([]),
                carpet_area: z.string().default(''),
                wood_area: z.string().default(''),
                subfloor_type: z.string().default(''),
                has_skirting_boards: z.boolean().default(false),
                skirting_finish: z.string().nullable().default(null),
                other_requirements: z.array(z.string()).default([]),
                is_area_cleared: z.boolean().default(false),
                manual_accessories: z.array(z.string()).default([]),
                understands_estimate: z.boolean().default(true),
                agrees_to_emails: z.boolean().default(false),
                notes: z.string().default(''),
                utm_source: z.string().default(''),
                utm_campaign: z.string().default(''),
                utm_medium: z.string().default(''),
                submission_date: z.string().default(''),
            }),
        }),
        execute: async ({ formData }) => {
            // send fetch reuqest to get estiamte data
            const estimateWebhook = 'https://tfe.app.n8n.cloud/webhook/3a4f584c-cde1-41b4-b90e-c7c5d40a11266';
            const estimateData = await fetch(estimateWebhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const json = await estimateData.json();
            console.log('===========TOOL  estimateTool : ', json[0] || json);

            return json[0] || json;

        },
    }),

}

// export const ghlCreateAppointment = async ({
//     tokens = TOKENS,
//     locationId = LOCATION_ID,
//     data = {
//         locationId: '',
//         contactId: '',
//         calendarId: '',
//         description: '',
//         title: '',
//         description: '',
//         startTime: '',
//         endTime: '',
//     },
// })

export const AiToolsGhl = {
    //opportunities tools
    ghlCreateOpportunityTool: tool({
        description: 'Create a new opportunity in GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            data: z.object({
                pipelineId: z.string(),
                name: z.string(),
                pipelineStageId: z.string(),
                status: z.string().default('open'),
                contactId: z.string().describe('The ID of the contact associated with the opportunity which is usually ghl_id or id'),
                monetaryValue: z.number().default(0),
                assignedTo: z.string().optional(),
                customFields: z.array(z.any()).optional(),
            }),
        }),
        execute: async ({ locationId, data }) => {
            // Implement the logic to create an opportunity in GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                data: {
                    ...data,
                    // pipelineId: 'jeE3ydJVSqONDnIyWH7o',
                    // pipelineStageId: '222de456-cee4-46f8-ac94-7a5806d9bd84',
                }
            }
            const result = await ghlCreateOpportunity(dod);

            console.log('===========TOOL  ghlCreateOpportunityTool : ', result?.success);
            if (!result?.success) {
                // console.log(locationId);
                console.log(dod?.opportunityData);
                console.log(result);
            }

            // console.log('dod: ', dod);
            // console.log('result: ', result);

            return result;
        },
    }),
    ghlGetOpportunitiesTool: tool({
        description: 'Get opportunities from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            query: z.object({
                q: z.string().describe('Search query string for opportunities'),
                contact_id: z.string().optional().describe('GHL contact ID(ghl_id || id) to filter opportunities by contact'),
            }),
        }),
        execute: async ({ locationId, query }) => {
            // Implement the logic to get opportunities from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                query: query,
            }
            const result = await ghlGetOpportunities(dod);
            console.log('===========TOOL  ghlGetOpportunitiesTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    ghlUpdateOpportunityTool: tool({
        description: 'Update an existing opportunity in GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            opportunityId: z.string(),
            data: z.object({
                name: z.string().optional(),
                pipelineStageId: z.string().optional(),
                status: z.string().optional(),
                monetaryValue: z.number().optional(),
                assignedTo: z.string().optional(),
                customFields: z.array(z.any()).optional(),
            }),
        }),
        execute: async ({ locationId, opportunityId, data }) => {
            // Implement the logic to update an opportunity in GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                opportunityId: opportunityId,
                data: data,
            };
            const result = await ghlUpdateOpportunity(dod);
            console.log('===========TOOL  ghlUpdateOpportunityTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    ghlDeleteOpportunityTool: tool({
        description: 'Delete an opportunity from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            opportunityId: z.string(),
        }),
        execute: async ({ locationId, opportunityId }) => {
            // Implement the logic to delete an opportunity from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const result = await ghlDeleteOpportunity({
                tokens: tokens,
                locationId: locationId,
                opportunityId: opportunityId,
            });
            console.log('===========TOOL  ghlDeleteOpportunityTool : ', result?.success);
            return result;
        },
    }),
    ghlDeleteOpportunityTool: tool({
        description: 'Delete an opportunity from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            opportunityId: z.string(),
        }),
        execute: async ({ locationId, opportunityId }) => {
            // Implement the logic to delete an opportunity from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                opportunityId: opportunityId,
            };
            const result = await ghlDeleteOpportunity(dod);
            console.log('===========TOOL  ghlDeleteOpportunityTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    // calendar tools
    ghlGetCalendarSlotsTool: tool({
        description: 'Get available calendar slots from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string().describe('GHL location ID'),
            calendarId: z.string().describe('Calendar ID to get slots from'),
            startDate: z.number().describe('Start timestamp in milliseconds'),
            endDate: z.number().describe('End timestamp in milliseconds'),
        }),
        execute: async ({ locationId, calendarId, startDate, endDate }) => {
            // Implement the logic to get calendar slots from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const result = await ghlGetCalendarSlots({
                tokens,
                locationId: locationId,
                data: {
                    calendarId,
                    startTime: startDate,
                    endTime: endDate,
                }
            });
            // console.log('dod: ', dod.data);
            console.log('===========TOOL  ghlGetCalendarSlotsTool : ', result?.success);
            console.log('result: ', result);


            return result;
        },
    }),
    ghlGetCalendarEventsTool: tool({
        description: 'Get calendar events from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            calendarId: z.string().describe('Calendar ID to get events from'),
            startTime: z.number().describe('Start timestamp in milliseconds'),
            endTime: z.number().describe('End timestamp in milliseconds'),
        }),
        execute: async ({ locationId, calendarId, startTime, endTime }) => {
            // Implement the logic to get calendar events from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                data: {
                    locationId: locationId,
                    calendarId,
                    startTime: startTime,
                    endTime: endTime,
                }
            }
            const result = await ghlGetCalendarEvents(dod);
            console.log('===========TOOL  ghlGetCalendarEventsTool : ', result?.success);
            console.log('dod: ', dod?.data);
            console.log('result: ', result);
            return result;
        },
    }),
    ghlCreateAppointmentTool: tool({
        description: 'Create a new appointment in GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            data: z.object({
                locationId: z.string(),
                contactId: z.string(),
                calendarId: z.string(),
                description: z.string(),
                title: z.string(),
                startTime: z.string().describe('ISO string'),
                endTime: z.string().describe('ISO string'),
            }),
        }),
        execute: async ({ locationId, data }) => {
            // Implement the logic to create an appointment in GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                data: data,
            }
            const result = await ghlCreateAppointment(dod);
            console.log('===========TOOL  ghlCreateAppointmentTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    ghlUpdateAppointmentTool: tool({
        description: 'Update an existing appointment in GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            appointmentId: z.string().describe('The ID of the appointment to update'),
            data: z.object({
                description: z.string().optional(),
                title: z.string().optional(),
                startTime: z.string().optional().describe('ISO string'),
                endTime: z.string().optional().describe('ISO string'),
            }),
        }),
        execute: async ({ locationId, appointmentId, data }) => {
            // Implement the logic to update an appointment in GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                appointmentId: appointmentId,
                data: data,
            };
            const result = await ghlUpdateAppointment(dod);
            console.log('===========TOOL  ghlUpdateAppointmentTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    ghlDeleteAppointmentTool: tool({
        description: 'Delete an appointment from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            appointmentId: z.string().describe('The ID of the appointment to delete'),
        }),
        execute: async ({ locationId, appointmentId }) => {
            // Implement the logic to delete an appointment from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                appointmentId: appointmentId,
            };
            const result = await ghlDeleteAppointment(dod);
            console.log('===========TOOL  ghlDeleteAppointmentTool : ', result?.success);
            // console.log('dod: ', dod);
            // console.log('result: ', result);
            return result;
        },
    }),
    // other 
    ghlGetContactsTool: tool({
        description: 'Get contacts from GoHighLevel CRM',
        inputSchema: z.object({
            locationId: z.string(),
            options: z.object({
                query: z.string().describe('Search query string for contacts').default(''),
                limit: z.number().min(1).max(100).default(10).describe('Maximum number of records to return'),
            }).default({}),
        }),
        execute: async ({ locationId, options }) => {
          
            // Implement the logic to get contacts from GoHighLevel CRM
            const tokens = await ghlGetTokens();
            const dod = {
                tokens: tokens,
                locationId: locationId,
                options,
            };
            const result = await ghlGetContacts(dod);
            console.log('===========TOOL  ghlGetContactsTool : ', result?.success);
            return result;
        },
    }),
};

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


export const processMessages = async ({
    messages,
    profileData = null,
}) => {
    try {


        const d = {
            model: openai(aiModelName),
            messages: messages,
            tools: AiTools,
            stopWhen: stepCountIs(10),//to allow multiple tool calls then response
            system: [
                'You\'re Ava, the construction company\'s assistant. Speak as a person—not an AI.',
                'keem messages short yet polite, don\'t be too verbose.',
                'dont use double negations, dashes.',
                'be slightly informal and friendly in tone.',
                'currency us British pounds (£), use it with numbers if relevant.',

                'if its your first message greet the user, say your name is Ava , if not first message just say hi.',
                'use tools when needed to answer user questions.',
                'check messages: if postcode exists, run addressCheckerTool; if not, request postcode.',
                'if formData exists but no estimate provided, use estimateTool to get estimate data. (at the end of the esetimate say "Email sent with full estimate details." if email provided if not ask for email).',
                'if postcode supported, offer to schedule a quick example message:"Are you open to scheduling a quick call with one of our flooring experts to discuss the details of your project and answer any questions?"',
                'if you already sent similar message before, don\'t repeat it again. Formulate question a little differently.',
                'if user previously submitted a form acknowledge it and check what is different now.',
                'make sure to scan and use any relevant and useful information from previous messages in the conversation.',
            ].join(' ')
        };

        if (!profileData) {
            console.warn('processMessages: No profileData provided.');
            return null;
        }
        const aiResponse = await generateText({
            ...profileData,
            stopWhen: stepCountIs(10),//to allow multiple tool calls then response
            model: openai(aiModelName),
            messages,
        });

        // console.log('processMessages: ', aiResponse.content);



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