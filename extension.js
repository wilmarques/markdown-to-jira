const vscode = require('vscode');
const jira2md = require('jira2md');
const path = require('path');

/**
 * Helper functions below
 */
function isCurrentFileValid(document, fileExtension) {
    return document.fileName.endsWith(fileExtension);
}

function getCurrentDirectory(document) {
    return path.dirname(document.uri.path);
}

function openNewDocumentWithConvertedText(directory, newFileText, fileExtension) {
    // Establish new file path for formatted file
    let newFilePath = path.join(directory, "formatted_file" + fileExtension);
    let uri = vscode.Uri.file(newFilePath).with({ scheme: 'untitled' });

    return vscode.workspace.openTextDocument(uri).then(
        document => {
            let addedText = new vscode.WorkspaceEdit();
            addedText.insert(uri, new vscode.Position(0, 0), newFileText);

            // If the text was added successfully, we can open the document for the user
            vscode.workspace.applyEdit(addedText).then(
                success => {
                    if (success) {
                        vscode.window.showTextDocument(document, vscode.window.Beside);
                    } else {
                        vscode.window.showInformationMessage('Sorry, we were unable to show you the converted text!');
                    }
                }
            );
        }
    );
}

function toMarkdown() {
    let document = vscode.window.activeTextEditor.document;

    // Make sure current file is a Jira file
    const isJiraFile = isCurrentFileValid(document, "jira");
    if (!isJiraFile) {
        vscode.window.showInformationMessage("Sorry, this isn't a JIRA (.jira) file.");
    }

    // Convert current file into Markdown formatting
    let markdownFormatted = jira2md.to_markdown(document.getText());

    openNewDocumentWithConvertedText(getCurrentDirectory(document), markdownFormatted, ".md");
}

function toJira() {
    let document = vscode.window.activeTextEditor.document;

    // Make sure current file is a Markdown file
    const isMarkdownFile = isCurrentFileValid(document, "md");
    if (!isMarkdownFile) {
        vscode.window.showInformationMessage("Sorry, this isn't a Markdown (.md) file.");
    }

    // Convert current file into JIRA formatting
    let jiraFormatted = jira2md.to_jira(document.getText());
    // Handle Mermaid snippets
    jiraFormatted = jiraFormatted.replace(
        /^(\{code:mermaid\})((.|\n)*?)(\{code\})/gm,
        convertMermaidCodeSnippetToHTMLMacro()
    );

    openNewDocumentWithConvertedText(getCurrentDirectory(document), jiraFormatted, ".jira");
}

function convertMermaidCodeSnippetToHTMLMacro() {

    let firstTime = true;

    return function(match, openingCodeTag, mermaidCode, closingCodeTag) {

        let mermaidContainer = `<div class="mermaid">${mermaidCode}</div>`;
        let mermaidScripts = '<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script><script>mermaid.initialize({ startOnLoad: true });</script>';
        let template = firstTime === true
            ? `{html}${mermaidScripts}${mermaidContainer}{html}`
            : `{html}${mermaidContainer}{html}`;

        firstTime = false;

        return template;
    }
}

// Method is called when the extension is first activated
function activate(context) {
    console.log('The Markdown <-> JIRA extension is now active! Wiley!');

    // Register the commands for converting Markdown and JIRA
    let to_jira = vscode.commands.registerCommand('extension.convertMarkdownWithMermaid',
        function () {
            toJira();
        }
    );
    context.subscriptions.push(to_jira);
}
exports.activate = activate;

// Method is called when the extension is deactivated
function deactivate() {
    vscode.window.showInformationMessage(":(");
}
exports.deactivate = deactivate;
