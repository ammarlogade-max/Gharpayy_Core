/**
 * modules/coach-ai/lib/export-engine.ts
 * 
 * Handles the generation and download of executive operational briefings.
 */

export const exportOperationalReport = (content: string, metadata: { timestamp: Date; healthScore?: number; query: string }) => {
  const { timestamp, healthScore, query } = metadata;
  
  const formattedDate = timestamp.toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'medium'
  });

  const reportHeader = `
====================================================
GHARPAYY CORE — EXECUTIVE OPERATIONAL BRIEFING
====================================================
Generated: ${formattedDate}
Subject: Operational Diagnostic - "${query}"
Organization Health Score: ${healthScore ?? 'N/A'}/100
====================================================

`;

  const reportFooter = `
====================================================
End of Operational Briefing
Confidential — Gharpayy Internal Use Only
====================================================
`;

  const fullReport = `${reportHeader}\n${content}\n${reportFooter}`;

  // Create and trigger download
  const blob = new Blob([fullReport], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const fileName = `gharpayy-briefing-${timestamp.getTime()}.md`;
  
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
