import jsPDF from 'jspdf';
import { ChatSession } from '../types';

export const exportSessionToPdf = (session: ChatSession, userName: string = 'User'): void => {
  if (!session || !session.messages || session.messages.length === 0) {
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const addHeader = () => {
    // Top banner
    doc.setFillColor(30, 27, 75); // Dark indigo #1e1b4b
    doc.rect(0, 0, pageWidth, 60, 'F');

    // Title inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Omnisym AI Chat Transcript', margin, 35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text('Multimodal Neural Documentation', pageWidth - margin, 35, { align: 'right' });

    cursorY = 80;
  };

  const addMetadataBlock = () => {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, cursorY, contentWidth, 54, 6, 6, 'FD');

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(session.title || 'Untitled Conversation', margin + 12, cursorY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500

    const dateStr = new Date(session.createdAt || Date.now()).toLocaleString();
    doc.text(`User: ${userName}  •  Date: ${dateStr}`, margin + 12, cursorY + 33);
    doc.text(`Messages: ${session.messages.length}  •  Mode: ${session.mode || 'Default'}`, margin + 12, cursorY + 45);

    cursorY += 70;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 20) {
      doc.addPage();
      cursorY = margin + 15;
    }
  };

  addHeader();
  addMetadataBlock();

  // Render messages
  session.messages.forEach((msg, index) => {
    if (msg.status === 'error') return;

    const isUser = msg.role === 'user';
    const senderLabel = isUser ? `${userName} (User)` : 'Omnisym Assistant';
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Clean text of internal tags
    const cleanText = msg.text
      .replace(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*[^\]]+\]/gi, '')
      .replace(/\[SAVE_MEMORY:\s*[^\]]+\]/gi, '')
      .trim();

    // Calculate text wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const textLines = doc.splitTextToSize(cleanText || '(Attachment / Image)', contentWidth - 24);
    const textHeight = textLines.length * 13;
    const blockHeight = textHeight + 36;

    checkPageBreak(blockHeight + 10);

    // Box styling
    if (isUser) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
    } else {
      doc.setFillColor(255, 255, 255); // white
      doc.setDrawColor(224, 231, 255); // indigo-100
    }

    doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 6, 6, 'FD');

    // Header within message
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(isUser ? 30 : 67, isUser ? 41 : 56, isUser ? 59 : 202); // slate-800 or indigo-600
    doc.text(senderLabel, margin + 12, cursorY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(timeStr, margin + contentWidth - 12, cursorY + 16, { align: 'right' });

    // Separator line inside box
    doc.setDrawColor(isUser ? 226 : 238, isUser ? 232 : 242, isUser ? 240 : 255);
    doc.line(margin + 12, cursorY + 22, margin + contentWidth - 12, cursorY + 22);

    // Message Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(textLines, margin + 12, cursorY + 36);

    cursorY += blockHeight + 10;
  });

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
    doc.text(
      `Omnisym AI Workspace  •  Confidential & Offline Ready`,
      margin,
      pageHeight - 18
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 18,
      { align: 'right' }
    );
  }

  // Sanitise filename
  const sanitisedTitle = (session.title || 'omnisym_chat')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  doc.save(`${sanitisedTitle}_transcript.pdf`);
};
