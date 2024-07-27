// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "svg-liquid" is now active!');

	// Create a status bar item
	let statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 200);
	statusBarIcon.text = `Svg Liquid`;
	statusBarIcon.tooltip = "View Svg Liquid";
	statusBarIcon.command = "svg-liquid.showIcon";
	statusBarIcon.show();

	context.subscriptions.push(statusBarIcon);

	const newPageDisposable = vscode.commands.registerCommand('svg-liquid.showIcon', async function () {
		const panel = vscode.window.createWebviewPanel(
			'myWebview',
			'Svg Liquid', 
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		panel.webview.html = await getWebviewContent();

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		// Set the icon in the title
        panel.iconPath = vscode.Uri.file(context.asAbsolutePath('media/icon.svg'));

	});

	context.subscriptions.push(newPageDisposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

async function checkSnippetFolder(folderPath) {
    try {
        await fs.access(folderPath); 
		const files = (await fs.readdir(folderPath)).filter(file => file.includes('icon-')); 
        return files; 
    } catch (error) {
        return { access: false, error: error.message }; 
    }
}

async function getWebviewContent() {

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return '<div style="padding:10px;">No workspace is open.</div>';
	}
	const workspacePath = workspaceFolders[0].uri.fsPath;
	const snippetFolderPath = path.join(workspacePath, 'snippets');

		
	let iconFiles = await checkSnippetFolder(snippetFolderPath);

	if (iconFiles.access == false) {
		vscode.window.showInformationMessage('Snippet directory not found.');
		return `<div style="padding:10px;">${iconFiles.error}</div>`;
	}

	// Initialize an array to hold the contents of each file
	let fileContentsPromises = iconFiles.map(async (file) => {
		const fileName = file.split('.')[0];
		const filePath = path.join(snippetFolderPath, file);
		const content = await fs.readFile(filePath, 'utf8');
		if (content.startsWith('<svg')) {
			return `<li data-icon=${fileName}>${content} ${file}</li>`; // Return a list item with the content
		}
	});

	// Wait for all file contents to be read
	let listItems = await Promise.all(fileContentsPromises);
	
	// HTML content to display in the webview
	return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>My Webview</title>
		</head>
		<body>
			<h2>Svg Liquid</h2>
			<input type="text" id="search" placeholder="Search icon">
			<ul class="result">
				${listItems !== undefined ? listItems.join('') : 'Icon not found'} 
			</ul>
				
			<script>
				const vscode = acquireVsCodeApi(); 

				document.addEventListener('DOMContentLoaded', function() {
					const search = document.getElementById('search');
					search.addEventListener('input', function() {
						const searchText = search.value.toLowerCase();
						const listItems = document.querySelectorAll('li');
						listItems.forEach(item => {
							const text = item.innerText.toLowerCase();
							if (text.includes(searchText)) {
								item.style.display = 'flex';
							} else {
								item.style.display = 'none';
							}
						});
					});

					document.querySelectorAll('.result li').forEach(item => {
						item.addEventListener('click', function() {
							const icon = item.dataset.icon;
							vscode.postMessage({
								command: 'alert',
								text: icon + ' copied to clipboard.'
							});
							navigator.clipboard.writeText("{% render '"+icon+"' %}");
						});
					});
				});

					
			</script>
			<style>
				ul {
					list-style-type: none;
					padding: 0;
				}
				li {
					display: flex;
					align-items: center;
					margin: 10px;
					cursor: pointer;
				}
				svg {
					width: 24px;
					height: 24px;
					margin-right: 10px;
				}
				#search {
					padding: 10px;
					min-width: 320px;
					border-radius: 4px;
					border: 1px solid #9d9d9d;
				}
			</style>
		</body>
	</html>`;
}

module.exports = {
	activate,
	deactivate
}
