// Helper function to parse Atom feed entries (reused across multiple endpoints)
function parseAtomFeed(xmlText) {
  const entries = [];
  const entryMatches = xmlText.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

  entryMatches.forEach(entryXml => {
    const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/);
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/);
    const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/);
    const summaryMatch = entryXml.match(/<summary[^>]*>(.*?)<\/summary>/);

    entries.push({
      title: titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '',
      link: linkMatch ? linkMatch[1] : '',
      updated: updatedMatch ? updatedMatch[1] : '',
      summary: summaryMatch ? summaryMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''
    });
  });

  return entries;
}

module.exports = { parseAtomFeed };

