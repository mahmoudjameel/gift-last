const fs = require('fs');
const path = require('path');

const inspectorDir = path.join(__dirname, '..', 'node_modules', 'react-native', 'src', 'private', 'inspector');
const sourceDir = path.join(__dirname, '..', 'node_modules', 'react-native', 'src', 'private', 'devsupport', 'devmenu', 'elementinspector');

if (fs.existsSync(sourceDir) && !fs.existsSync(inspectorDir)) {
  try {
    fs.mkdirSync(inspectorDir, { recursive: true });

    const shimContent = (moduleName) =>
      `module.exports = require("react-native/src/private/devsupport/devmenu/elementinspector/${moduleName}");\n`;

    fs.writeFileSync(
      path.join(inspectorDir, 'getInspectorDataForViewAtPoint.js'),
      shimContent('getInspectorDataForViewAtPoint')
    );

    fs.writeFileSync(
      path.join(inspectorDir, 'InspectorOverlay.js'),
      shimContent('InspectorOverlay')
    );
  } catch (e) {
    // silent fail
  }
}

const transformerPath = path.join(__dirname, '..', 'node_modules', '@rork-ai', 'toolkit-sdk', 'metro', 'transformer.js');

if (fs.existsSync(transformerPath)) {
  try {
    let content = fs.readFileSync(transformerPath, 'utf8');

    if (!content.includes('55.')) {
      content = content.replace(
        `if (version.startsWith("54.")) return "54";`,
        `if (version.startsWith("55.")) return "54";\n        if (version.startsWith("54.")) return "54";`
      );
      fs.writeFileSync(transformerPath, content);
    }
  } catch (e) {
    // silent fail
  }
}
