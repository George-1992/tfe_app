
import fs from 'fs';
import { HighLevel, LogLevel } from '@gohighlevel/api-client';

const TOKENS = {}

const GHL_API_KEY = process.env.GHL_API_KEY;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const thisDir = process.cwd();

if (!GHL_API_KEY || !LOCATION_ID) {
    console.error('Add GHL_AGENCY_API_KEY and GHL_LOCATION_ID to .env');
    // process.exit(1);
}

const ghlConfig = {
    apiKey: GHL_API_KEY,
    code: process.env.GHL_AUTH_CODE,
    clientId: process.env.GHL_APP_CLIENT_ID,
    clientSecret: process.env.GHL_APP_CLIENT_SECRET,
    scope: [
        "businesses.readonly",
        "businesses.write",

        "calendars.readonly",
        "calendars.write",
        "calendars/events.readonly",
        "calendars/events.write",
        "calendars/groups.readonly",
        "calendars/groups.write",
        "calendars/resources.readonly",
        "calendars/resources.write",
        "campaigns.readonly",

        "conversations.readonly",
        "conversations.write",
        "conversations/message.readonly",
        "conversations/message.write",
        "conversations/reports.readonly",
        "conversations/livechat.write",

        "contacts.readonly",
        "contacts.write",

        // "associations.write",
        // "associations.readonly",
        // "associations/relation.readonly",
        // "associations/relation.write",

        // "courses.write",
        // "courses.readonly",

        // "forms.readonly",
        // "forms.write",

        // "invoices.readonly",
        // "invoices.write",
        // "invoices/schedule.readonly",
        // "invoices/schedule.write",
        // "invoices/template.readonly",
        // "invoices/template.write",
        // "invoices/estimate.readonly",
        // "invoices/estimate.write",

        // "links.readonly",
        // "lc-email.readonly",
        // "links.write",
        // "locations.write",
        "locations.readonly",
        // "locations/customValues.readonly",
        // "locations/customValues.write",
        // "locations/customFields.readonly",
        // "locations/customFields.write",
        // "locations/tasks.readonly",
        // "locations/tasks.write",
        "locations/tags.readonly",
        "locations/tags.write",
        "locations/templates.readonly",

        // "recurring-tasks.readonly",
        // "recurring-tasks.write",

        "medias.readonly",
        // "medias.write",

        // "funnels/redirect.readonly",
        // "funnels/page.readonly",
        // "funnels/funnel.readonly",
        // "funnels/pagecount.readonly",
        // "funnels/redirect.write",

        // "oauth.write",
        // "oauth.readonly",

        // "opportunities.readonly",
        // "opportunities.write",

        // "payments/orders.readonly",
        // "payments/orders.write",
        // "payments/orders.collectPayment",
        // "payments/integration.readonly",
        // "payments/integration.write",
        // "payments/transactions.readonly",
        // "payments/subscriptions.readonly",
        // "payments/coupons.readonly",
        // "payments/coupons.write",
        // "payments/custom-provider.readonly",
        // "payments/custom-provider.write",
        // "products.readonly",
        // "products.write",
        // "products/prices.readonly",
        // "products/prices.write",
        // "products/collection.readonly",
        // "products/collection.write",

        // "saas/company.read",
        // "saas/company.write",
        // "saas/location.read",
        // "saas/location.write",

        // "snapshots.readonly",
        // "snapshots.write",

        // "socialplanner/oauth.readonly",
        // "socialplanner/oauth.write",
        // "socialplanner/post.readonly",
        // "socialplanner/post.write",
        // "socialplanner/account.readonly",
        // "socialplanner/account.write",
        // "socialplanner/csv.readonly",
        // "socialplanner/csv.write",
        // "socialplanner/category.readonly",
        // "socialplanner/tag.readonly",
        // "socialplanner/statistics.readonly",

        // "store/shipping.readonly",
        // "store/shipping.write",
        // "store/setting.readonly",
        // "store/setting.write",
        // "surveys.readonly",
        // "users.readonly",
        // "users.write",

        "workflows.readonly",
        // "emails/builder.write",
        // "emails/builder.readonly",
        // "emails/schedule.readonly",
        // "wordpress.site.readonly",
        // "blogs/post.write",
        // "blogs/post-update.write",
        // "blogs/check-slug.readonly",
        // "blogs/category.readonly",
        // "blogs/author.readonly",
        // "socialplanner/category.write",
        // "socialplanner/tag.write",
        // "custom-menu-link.readonly",
        // "custom-menu-link.write",
        // "blogs/posts.readonly",
        // "blogs/list.readonly",
        // "charges.readonly",
        // "charges.write",
        // "marketplace-installer-details.readonly",
        // "twilioaccount.read",
        // "phonenumbers.read",
        // "numberpools.read",
        // "documents_contracts/list.readonly",
        // "documents_contracts/sendLink.write",
        // "documents_contracts_template/sendLink.write",
        // "documents_contracts_template/list.readonly",
        // "voice-ai-dashboard.readonly",
        // "voice-ai-agents.readonly",
        // "voice-ai-agents.write",
        // "voice-ai-agent-goals.readonly",
        // "voice-ai-agent-goals.write",
        // "knowledge-bases.write",
        // "knowledge-bases.readonly",
        "conversation-ai.readonly",
        // "conversation-ai.write",
        // "agent-studio.readonly",
        // "agent-studio.write",


        // "companies.readonly",
        // "objects/schema.readonly",
        // "objects/schema.write",
        // "objects/record.readonly",
        // "objects/record.write",

    ].join(' ')
};
const ghl = new HighLevel({
    clientId: ghlConfig.clientId,
    clientSecret: ghlConfig.clientSecret,
    // sessionStorage: new InMemorySessionStorage(),
    // privateIntegrationToken: ghlConfig.apiKey
    // logLevel: LogLevel.DEBUG,    
});

const test = async () => {
    console.log('');
    console.log('===========================');
    console.log('Location ID:', LOCATION_ID);
    console.log('Key starts with:', GHL_API_KEY.substring(0, 20) + '...');
    console.log('');

    // Try multiple endpoint variations
    const endpoints = [
        `https://rest.gohighlevel.com/v1/contacts/`,
        // `https://rest.gohighlevel.com/v2/contacts/`,
        // `https://services.leadconnectorhq.com/contacts/`,

        // 'https://services.leadconnectorhq.com/contacts/',
    ];

    const params = {
        locationId: LOCATION_ID,
        // limit: 1,
        // query: 'paulo@theflooringempire.co.uk',
        fields: 'name,email,phone'
    }
    const endpoint = endpoints[0];
    let queryString = '';

    for (let i = 0; i < Object.keys(params).length; i++) {
        const key = Object.keys(params)[i];
        const value = Object.values(params)[i];
        if (i === 0) {
            queryString += `?${key}=${value}`;
        } else {
            queryString += `&${key}=${value}`;
        }
    }
    const url = `${endpoint}${queryString}`;
    console.log('url: ', url);


    try {

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json',
                // 'X-Location-Id': LOCATION_ID  // Alternative header
            },
        }
        // const options = {
        //     'method': 'GET',
        //     'maxBodyLength': Infinity,
        //     'headers': {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${GHL_API_KEY}`,
        //         'Version': '2021-07-28',
        //         'X-Location-Id': LOCATION_ID,
        //     }
        // };


        const response = await fetch(url, options);

        // console.log('Status:', response.status);

        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ SUCCESS with endpoint:', url);
            console.log('Contacts found:', data.contacts?.length || 0);
            if (data.contacts?.[0]) {
                console.log('Sample contact:', {
                    name: data.contacts[0].firstName || 'N/A',
                    email: data.contacts[0].email || 'N/A'
                });
            }
            return data;
        } else {
            const text = await response.text();
            console.log('Response:', text);

        }
    } catch (error) {
        console.error('Error with endpoint:', error.message);
    }


    throw new Error('All contact endpoints failed. Check Location ID and API key permissions.');
};
// test();


const getAuthorizationUrl = async () => {

    try {
        const keys = Object.keys(ghl.oauth);
        console.log('OAuth methods:', keys);

        // const response = await ghl.oauth.getAuthorizationUrl({
        //     'client_id': ghlConfig.clientId,
        //     // 'redirect_uri': 'https://nn.stepanyan.me/rest/oauth2-credential/callback',
        //     'redirect_uri': 'https://nn.stepanyan.me/webhook/48ad2c3c-ac9f-45c2-bfc1-17985e76e5b5',
        //     'scope': 'contacts:read',
        // });


        const response = await ghl.oauth.getAuthorizationUrl(
            ghlConfig.clientId,
            'https://nn.stepanyan.me/webhook/48ad2c3c-ac9f-45c2-bfc1-17985e76e5b5',
            ghlConfig.scope
        );

        // https://marketplace.leadconnectorhq.com/oauth/chooselocation?client_id=690d47656006737d78ee5a7e-mho62orc&redirect_uri=https%3A%2F%2Fnn.stepanyan.me%2Frest%2Foauth2-credential%2Fcallback&response_type=code&state=eyJ0b2tlbiI6ImlKZHRlbFFaLWtDSHB2N2ZnenRFZlU2M0U2WVJyNzBwWTlXZyIsImNpZCI6IjJFcFd1UU1XT0VHUWcyOUYiLCJjcmVhdGVkQXQiOjE3NjI0ODExOTI1NTB9&scope=contacts.readonly

        console.log('');
        console.log('Authorization URL:', response);
        console.log('');

    } catch (error) {
        console.error('Error:', error?.message || error);
    }
};
// getAuthorizationUrl();

const getAccessToken = async (code = '') => {
    let resObj = {
        success: false,
        warning: false,
        message: '',
        data: null,
    }
    try {
        const accessToken = await ghl.oauth.getAccessToken({
            client_id: ghlConfig.clientId,
            client_secret: ghlConfig.clientSecret,
            code: code || ghlConfig.code,
            grant_type: 'authorization_code',
        });
        console.log('getAccessToken : ', accessToken);

        // save to this location
        fs.writeFileSync(`${thisDir}/tokens.json`, JSON.stringify(accessToken, null, 2));

    } catch (error) {
        console.error(error);
        resObj.message = error.message || 'An error occurred';
        resObj.warning = true;
    }
}
// getAccessToken();
const refresToken = async () => {
    try {
        const tokenDetails = TOKENS;
        // console.log('tokenDetails: ', tokenDetails);
        const token = await ghl.oauth.refreshToken(
            tokenDetails.refresh_token,
            ghlConfig.clientId,
            ghlConfig.clientSecret,
            'refresh_token',
            tokenDetails.userType
        );

    } catch (error) {
        console.error('rfeshToken Error:', error.message);
    }
};

const setGhlToken = () => {

    try {

        // console.log('ghl.getSessionStorage(): ', ghl.getSessionStorage());

        ghl.getSessionStorage().setSession(LOCATION_ID, TOKENS);
    } catch (error) {
        console.error('Error setting GHL token:', error.message);
    }

};

const test2 = async () => {
    try {

        // const contacts = await ghl.contacts.getContacts(
        //     {
        //         locationId: LOCATION_ID,
        //         limit: 10,
        //         query: 'paulo@theflooringempire.co.uk'
        //     }
        // );
        // console.log('Contacts list:', contacts);

        // const response = await ghl.conversations.searchConversation({
        //     'locationId': LOCATION_ID,
        //     // 'contactId': '9VEmS0si86GW6gXWU89b',
        //     // 'assignedTo': 'ABCHkzuJQ8ZMd4Te84GK,fGiae4CHkzoskh8thsik',
        //     // 'followers': 'ABCHkzuJQ8ZMd4Te84GK,fGiae4CHkzoskh8thsik',
        //     // 'mentions': 'ABCHkzuJQ8ZMd4Te84GK,fGiae4CHkzoskh8thsik',
        //     'query': '1:30',
        //     // 'sort': 'asc',
        //     // 'startAfterDate': 1600854,
        //     // 'id': 'ABCHkzuJQ8ZMd4Te84GK',
        //     // 'limit': 20,
        //     // 'lastMessageType': 'TYPE_SMS',
        //     // 'lastMessageAction': 'manual',
        //     // 'lastMessageDirection': 'inbound',
        //     // 'status': 'all',
        //     // 'sortBy': 'last_message_date',
        //     // 'sortScoreProfile': 'ABCHkzuJQ8ZMd4Te84GK',
        //     // 'scoreProfile': 'ABCHkzuJQ8ZMd4Te84GK',
        //     // 'scoreProfileMin': 'ABCHkzuJQ8ZMd4Te84GK',
        //     // 'scoreProfileMax': 'ABCHkzuJQ8ZMd4Te84GK'
        // });
        // console.log(response);


        // const response = await highLevel.conversations.getConversation({
        //     'conversationId': 'tDtDnQdgm2LXpyiqYvZ6'
        // });
        // console.log(response);


        // // create conversation
        // const response = await ghl.conversations.createConversation({
        //     locationId: LOCATION_ID,
        //     contactId: '3BJIeUVDVdXI3pQsVivR',
        //     // channel: 'sms',
        //     // initialMessage: {
        //     //     type: 'text',
        //     //     text: 'Hello from API client!',
        //     // },
        // });
        // console.log('Created conversation:', response);


        // send message
        // // email message
        // const response = await ghl.conversations.sendANewMessage({
        //     'type': 'Email',
        //     'contactId': 'abc123def456',
        //     // 'appointmentId': 'appt123',
        //     // 'attachments': [
        //     //     'https://storage.com/file1.pdf',
        //     //     'https://storage.com/file2.jpg'
        //     // ],
        //     // 'emailFrom': 'sender@company.com',
        //     // 'emailCc': [
        //     //     'cc1@company.com',
        //     //     'cc2@company.com'
        //     // ],
        //     // 'emailBcc': [
        //     //     'bcc1@company.com',
        //     //     'bcc2@company.com'
        //     // ],
        //     // 'html': '<p>Hello World</p>',
        //     // 'message': 'Hello, how can I help you today?',
        //     // 'subject': 'Important Update',
        //     // 'replyMessageId': 'msg123',
        //     // 'templateId': 'template123',
        //     // 'threadId': 'thread123',
        //     // 'scheduledTimestamp': 1669287863,
        //     // 'conversationProviderId': 'provider123',
        //     // 'emailTo': 'recipient@company.com',
        //     // 'emailReplyMode': 'reply_all',
        //     // 'fromNumber': '+1499499299',
        //     // 'toNumber': '+1439499299',
        //     // 'status': 'delivered'
        // });
        // console.log(response);


        // sms message
        const response = await ghl.conversations.sendANewMessage({
            'type': 'SMS',
            'locationId': LOCATION_ID,
            'contactId': '3BJIeUVDVdXI3pQsVivR',
            'message': 'Hello from TFE AI assistant - API SMS test!',
            'fromNumber': '+447700137103',
            'toNumber': '+447555565699',
        });
        console.log('Sent SMS message:', response);


    } catch (error) {
        // console.error(error);
        console.error('Error with HighLevel client:', error.message);
    }
};

// (async () => {
//     // getAuthorizationUrl();
//     // getAccessToken('5ac03fa49e7cba6f1e6b797cdf6c702039de658e');
//     // await refresToken();
//     setGhlToken();
//     test2();
// })();


// =============new

const handleErorr = (error) => {
    let resObj = {
        success: false,
        message: '',
        data: null,
    }
    try {

        resObj.message = error.message || 'An error occurred';
        resObj.data = error.response || null;

        return resObj;

    } catch (error) {
        console.error('handleErorr error: ', error);
        resObj.message = error.message || 'An error occurred';
        return resObj;
    }
};
const setGhlSession = async ({
    locationId = LOCATION_ID,
    tokens = TOKENS
}) => {

    try {

        // console.log('getAuthorizationUrl: ', getAuthorizationUrl());
        // console.log('getAccessToken: ', getAccessToken('666520d227249bf33cb0ea5edcf5f857f3fc79e6'));


        ghl.getSessionStorage().setSession(locationId, tokens);
    } catch (error) {
        console.error('Error setting GHL token:', error.message);
    }

};
export const ghlGetTokens = async () => {
    try {
        const ghlTokens = await Prisma.tokens.findFirst({
            where: { name: 'ghl' },
        });
        // console.log('ghlTokens: ', ghlTokens);

        return ghlTokens ? ghlTokens.data : null;
    } catch (error) {
        console.error('Error fetching GHL tokens:', error.message);
        return null;
    }
};
export const ghlGetContacts = async ({
    tokens = TOKENS,
    locationId = LOCATION_ID,
    options = {}
}) => {
    let resObj = {
        success: false,
        warning: false,
        message: '',
        data: null,
    }
    try {

        await setGhlSession({ tokens, locationId });
        let q = {
            locationId: locationId,
            limit: 10,
            // query: 'paulo@theflooringempire.co.uk'
        };
        if (options.query) {
            q.query = options.query;
        }
        if (options.limit) {
            q.limit = options.limit;
        }
        const response = await ghl.contacts.getContacts(q);

        resObj.success = true;
        resObj.message = 'Contacts fetched successfully';
        resObj.data = response;
        return resObj;

    } catch (error) {
        console.error('Error fetching GHL contacts:', error.message);
        resObj.message = error.message || 'An error occurred';
        resObj.success = false;
        return resObj;
    }
};
export const ghlCreateContact = async ({
    tokens = TOKENS,
    locationId = LOCATION_ID,
    contactData = {}
}) => {

    let resObj = {
        success: false,
        warning: false,
        message: '',
        data: null,
    }

    try {

        await setGhlSession({ tokens, locationId });
        const response = await ghl.contacts.createContact({
            locationId: locationId,
            ...contactData
            // 'firstName': 'Rosan',
            // 'lastName': 'Deo',
            // 'name': 'Rosan Deo',
            // 'email': 'rosan@deos.com',
            // 'gender': 'male',
            // 'phone': '+1 888-888-8888',
            // 'address1': '3535 1st St N',
            // 'city': 'Dolomite',
            // 'state': 'AL',
            // 'postalCode': '35061',
            // 'website': 'https://www.tesla.com',
            // 'timezone': 'America/Chihuahua',
        });
        // console.log('ghlCreateContact response: ', response);


        resObj.success = true;
        resObj.message = 'Contact created successfully';
        resObj.data = response?.contact || response?.meta || response;

        return resObj;
    } catch (error) {
        console.error('Error creating GHL contact:', error?.message || error);
        resObj = handleErorr(error);

        return resObj;
    }
};

export const getConversations = async ({
    tokens = TOKENS,
    locationId = LOCATION_ID,
    query = {},
    options = {
        limit: 10,
    }
}) => {
    let resObj = {
        success: false,
        message: '',
        data: null,
    }
    try {
        await setGhlSession({ tokens, locationId });

        const toSendData = {
            locationId: locationId,
            limit: options.limit,
            ...query,
        };
        // console.log('toSendData: ', toSendData);

        const response = await ghl.conversations.searchConversation(toSendData);

        resObj.success = true;
        resObj.message = 'Conversations fetched successfully';
        resObj.data = response;
        return resObj;
    } catch (error) {
        console.log('getConversations error: ', error);
        resObj = handleErorr(error);
        return resObj;
    }
}

export const ghlGetMessages = async ({
    tokens = TOKENS,
    locationId = LOCATION_ID,
    query = {
        conversationId: '',
    },
    options = {
        limit: 10,
    }
}) => {
    let resObj = {
        success: false,
        message: '',
        data: null,
    }
    try {
        await setGhlSession({ tokens, locationId });

        const toSendData = {
            locationId: locationId,
            conversationId: query.conversationId,
            // lastMessageId: 'tDtDnQdgm2LXpyiqYvZ6',
            limit: options.limit || 10,
            type: 'TYPE_SMS',
            // type: ['TYPE_CALL', 'TYPE_SMS', 'TYPE_EMAIL', 'TYPE_FACEBOOK', 'TYPE_GMB', 'TYPE_INSTAGRAM', 'TYPE_WHATSAPP', 'TYPE_ACTIVITY_APPOINTMENT', 'TYPE_ACTIVITY_CONTACT', 'TYPE_ACTIVITY_INVOICE', 'TYPE_ACTIVITY_PAYMENT', 'TYPE_ACTIVITY_OPPORTUNITY', 'TYPE_LIVE_CHAT', 'TYPE_INTERNAL_COMMENTS', 'TYPE_ACTIVITY_EMPLOYEE_ACTION_LOG']
        };

        console.log('toSendData: ', toSendData);
        // const response = await ghl.conversations.getMessages(toSendData);
        const response = await ghl.conversations.getMessageTranscription({
            locationId: locationId,
            channel: 'channel_value',
            // 'cursor': 'a748514c-f49e-4fa8-9954-b53afc78d81d'
        });

        console.log(response);

        resObj.success = true;
        resObj.message = 'Messages fetched successfully';
        resObj.data = response;
        return resObj;

    } catch (error) {
        console.log('error: ', error);

        resObj = handleErorr(error);
        return resObj;
    }
}
export const ghlsendMessages = async ({
    tokens = TOKENS,
    locationId = LOCATION_ID,
    contact = {},
    message = {},
    options = {
        conversationId: '',
        limit: 10,
    }
}) => {
    let resObj = {
        success: false,
        message: '',
        data: null,
    }
    try {
        await setGhlSession({ tokens, locationId });


        const toSendData = {
            locationId: locationId,
            type: 'SMS',
            status: 'delivered',
            contactId: contact.id,
            message: 'Hello from TFE AI assistant - API SMS test!',
            // fromNumber: '+447700137103',
            // toNumber: contact.phone,
            // threadId: 'thread123',
        }
        // console.log('toSendData: ', toSendData);

        const response = await ghl.conversations.sendANewMessage(message);


        resObj.success = true;
        resObj.message = 'Messages fetched successfully';
        resObj.data = response;
        return resObj;

    } catch (error) {
        console.log('error: ', error);

        resObj = handleErorr(error);
        return resObj;
    }
}