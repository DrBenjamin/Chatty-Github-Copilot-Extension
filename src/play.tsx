import {
	BasePromptElementProps,
	PromptElement,
	PromptSizing,
	UserMessage
} from '@vscode/prompt-tsx';

export interface PromptProps extends BasePromptElementProps {
	userQuery: string;
}

export class PlayPrompt extends PromptElement<PromptProps, void> {
	render(_state: void, _sizing: PromptSizing) {
		return (
			<>
				<UserMessage>
					Reply in a chatty way, using cat analogies when
					appropriate. Give a small random R or
					python code sample.
				</UserMessage>
			</>
		);
	}
}
