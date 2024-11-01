import * as vscode from 'vscode';

const CAT_PARTICIPANT_ID = 'chat-sample.r-python';

interface IChatResult extends vscode.ChatResult {
    metadata: {
        command: string;
    }
}

export function registerSimpleParticipant(context: vscode.ExtensionContext) {

    // Define a chat handler. 
    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<IChatResult> => {
        // To talk to an LLM in your subcommand handler implementation, your
        // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
        // The GitHub Copilot Chat extension implements this provider.
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return { metadata: { command: 'randomTeach' } }; // Return a default
            }
            const document = editor.document;
            const fileContent = document.getText();
            const libraries_use = request.prompt.split(' ').filter(word => !word.startsWith('-') && !word.startsWith('+')).join(' ');
            const libraries_prio = request.prompt.split(' ').filter(word => word.startsWith('+')).map(word => word.substring(1)).join(' ');
            const libraries_avoid = request.prompt.split(' ').filter(word => word.startsWith('-')).map(word => word.substring(1)).join(' ');
            const messages = [
                vscode.LanguageModelChatMessage.User(`Think carefully and step by step.
                    Your job is to explain and transform R code into Python and vice versa. Always start your response by stating what concept you are explaining. Always include code samples.`),
                vscode.LanguageModelChatMessage.User(`This is the code which should be converted: """${fileContent}"""`),
                vscode.LanguageModelChatMessage.User(`Use these libraries: ${libraries_use} and prioritize these libraries: ${libraries_prio}`),
                vscode.LanguageModelChatMessage.User(`Avoid using these libraries: ${libraries_avoid}`),
                vscode.LanguageModelChatMessage.User(`Search the webaddress: https://shiny.posit.co/r/reference/shiny/latest/fluidpage`)
            ];

            const chatResponse = await request.model.sendRequest(messages, {}, token);
            for await (const fragment of chatResponse.text) {
                // Process the output from the language model
                // Replace all python function definitions with cat sounds to make the user stop looking at the code and start playing with the cat
                //const catFragment = fragment.replaceAll('def', 'meow');
                stream.markdown(fragment);
            }
        } catch (err) {
            handleError(logger, err, stream);
        }

        logger.logUsage('request', { kind: '' });
        return { metadata: { command: '' } };
    };

    // Chat participants appear as top-level options in the chat input
    // when you type `@`, and can contribute sub-commands in the chat input
    // that appear when you type `/`.
    const cat = vscode.chat.createChatParticipant(CAT_PARTICIPANT_ID, handler);
    cat.iconPath = vscode.Uri.joinPath(context.extensionUri, 'RP.png');
    cat.followupProvider = {
        provideFollowups(_result: IChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
            return [{
                prompt: 'let us play',
                label: vscode.l10n.t('Play with the converter'),
                command: 'play'
            } satisfies vscode.ChatFollowup];
        }
    };

    const logger = vscode.env.createTelemetryLogger({
        sendEventData(eventName, data) {
            // Capture event telemetry
            console.log(`Event: ${eventName}`);
            console.log(`Data: ${JSON.stringify(data)}`);
        },
        sendErrorData(error, data) {
            // Capture error telemetry
            console.error(`Error: ${error}`);
            console.error(`Data: ${JSON.stringify(data)}`);
        }
    });

    context.subscriptions.push(cat.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
        // Log chat result feedback to be able to compute the success matric of the participant
        // unhelpful / totalRequests is a good success metric
        logger.logUsage('chatResultFeedback', {
            kind: feedback.kind
        });
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleError(logger: vscode.TelemetryLogger, err: any, stream: vscode.ChatResponseStream): void {
    // making the chat request might fail because
    // - model does not exist
    // - user consent not given
    // - quote limits exceeded
    logger.logError(err);

    if (err instanceof vscode.LanguageModelError) {
        console.log(err.message, err.code, err.cause);
        if (err.cause instanceof Error && err.cause.message.includes('off_topic')) {
            stream.markdown(vscode.l10n.t('I\'m sorry, I can only explain data science concepts.'));
        }
    } else {
        // re-throw other errors so they show up in the UI
        throw err;
    }
}
