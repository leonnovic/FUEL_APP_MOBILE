import{E as S}from"./jspdf.es.min-BTTsNVbe.js";import{a as T}from"./jspdf.plugin.autotable-DEZvi-_-.js";import{aK as n,aW as r,aX as C}from"./index-rrdVMtT-.js";import{F as K}from"./FileSaver.min-BR4PgosY.js";function I(e){const a=new S;let o=20;if(e.companyData.logo){const l=new Image;l.src=e.companyData.logo,a.addImage(l,"PNG",80,10,50,20),o=40}a.setFontSize(16),a.setTextColor("#d4af37"),a.setFont("helvetica","bold"),a.text(e.companyData.name||"Company Name",105,o,{align:"center"}),a.setTextColor("#1a3a5f"),o+=10,a.setFontSize(12),a.setFont("helvetica","bold"),a.text("Fuel Delivery Report",105,o,{align:"center"}),o+=20,a.setFontSize(10),a.setFont("helvetica","normal"),a.text(`FUEL DELIVERED TO: ${e.deliveredTo||"Client"}`,14,o),o+=8,a.text(`TOTAL ORDER: ${e.totalOrder||"N/A"} Litres`,14,o),o+=8,a.text(`YEAR: ${e.deliveryYear||"2025"}`,14,o),o+=8,a.text(`Petrol Price: Ksh ${e.petrolPrice||"180"} /L`,14,o),o+=8,a.text(`Diesel Price: Ksh ${e.dieselPrice||"170"} /L`,14,o),o+=8;const t=e.deliveryData.columns.map(l=>l.label),m=e.deliveryData.rows.map(l=>e.deliveryData.columns.map(c=>c.key==="amount"?"Ksh "+n(l.amount):c.key==="debt"?"Ksh "+n(l.debt):l[c.key]||""));T(a,{startY:o,head:[t],body:m,theme:"striped"});const s=a.lastAutoTable.finalY+10;a.setFont("helvetica","bold"),a.text(`Total Supplied: ${n(e.deliveryData.totals.totalSupplied)} L`,14,s),a.text(`Total Payments: ${e.companyData.currency} ${n(e.deliveryData.totals.totalPayments)}`,70,s),a.text(`Balance Due: ${e.companyData.currency} ${n(e.deliveryData.totals.balanceDue,2)}`,130,s),o=s+10,a.setFont("helvetica","normal"),a.text(`P.O. Box: ${e.companyData.poBox||"N/A"}`,14,o),o+=8,a.text(`CONTACTS: ${e.companyData.contacts||"N/A"}`,14,o),o+=8,a.text(`EMAIL: ${e.companyData.email||"N/A"}`,14,o),o+=10,a.save(`Delivery_Report_${e.deliveredTo||"Client"}.pdf`)}function O(e){const a=r.book_new(),o=[[e.companyData.name||"Company Name"],["Fuel Delivery Report"],[],[`FUEL DELIVERED TO: ${e.deliveredTo||"Client"}`],[`TOTAL ORDER: ${e.totalOrder||"N/A"} Litres`],[`YEAR: ${e.deliveryYear||"2025"}`],[`Petrol Price: Ksh ${e.petrolPrice||"180"} /L`],[`Diesel Price: Ksh ${e.dieselPrice||"170"} /L`],[],e.deliveryData.columns.map(m=>m.label),...e.deliveryData.rows.map(m=>e.deliveryData.columns.map(s=>s.key==="amount"?e.companyData.currency+" "+n(m.amount):s.key==="debt"?e.companyData.currency+" "+n(m.debt):m[s.key]||"")),[],[`Total Supplied: ${n(e.deliveryData.totals.totalSupplied)} L`],[`Total Payments: Ksh ${n(e.deliveryData.totals.totalPayments)}`],[`Balance Due: Ksh ${n(e.deliveryData.totals.balanceDue,2)}`],[],[`P.O. Box: ${e.companyData.poBox||"N/A"}`],[`CONTACTS: ${e.companyData.contacts||"N/A"}`],[`EMAIL: ${e.companyData.email||"N/A"}`]],t=r.aoa_to_sheet(o);r.book_append_sheet(a,t,"Delivery Report"),C(a,`Delivery_Report_${e.deliveredTo||"Client"}.xlsx`)}function B(e){let a=`=== ${e.companyData.name||"Company Name"} ===
Fuel Delivery Report

`;a+=`FUEL DELIVERED TO: ${e.deliveredTo||"Client"}
`,a+=`TOTAL ORDER: ${e.totalOrder||"N/A"} Litres
`,a+=`YEAR: ${e.deliveryYear||"2025"}
`,a+=`Petrol Price: ${e.companyData.currency} ${e.petrolPrice||"180"} /L
`,a+=`Diesel Price: ${e.companyData.currency} ${e.dieselPrice||"170"} /L

`,a+=e.deliveryData.rows.map(t=>e.deliveryData.columns.map(m=>m.key==="amount"?`${m.label}: ${e.companyData.currency}${n(t.amount)}`:m.key==="debt"?`${m.label}: ${e.companyData.currency}${n(t.debt)}`:`${m.label}: ${t[m.key]||""}`).join(" | ")).join(`
`),a+=`

`,a+=`Total Supplied: ${n(e.deliveryData.totals.totalSupplied)} L
`,a+=`Total Payments: ${e.companyData.currency} ${n(e.deliveryData.totals.totalPayments)}
`,a+=`Balance Due: ${e.companyData.currency} ${n(e.deliveryData.totals.balanceDue,2)}

`,a+=`P.O. Box: ${e.companyData.poBox||"N/A"}
`,a+=`CONTACTS: ${e.companyData.contacts||"N/A"}
`,a+=`EMAIL: ${e.companyData.email||"N/A"}`;const o=new Blob([a],{type:"text/plain"});K.saveAs(o,`Delivery_Report_${e.deliveredTo||"Client"}.txt`)}function E(e){const a=e.debtData,o=new S;let t=20;if(e.companyData.logo){const s=new Image;s.src=e.companyData.logo,o.addImage(s,"PNG",80,10,50,20),t=40}o.setFontSize(16),o.setTextColor("#d4af37"),o.setFont("helvetica","bold"),o.text(e.companyData.name||"Company Name",105,t,{align:"center"}),o.setTextColor("#1a3a5f"),t+=10,o.setFontSize(14),o.setFont("helvetica","bold"),o.text("Fuel Debt Payment Reminder",105,t,{align:"center"}),t+=15,o.setFont("helvetica","normal"),o.setFontSize(12);const m=[`Dear ${a.name},`,"",`This is a gentle reminder that KES ${a.amount} for fuel supplied remains unpaid.`,"","Kindly settle the amount via Till:",`Buy Goods: ${a.till}`,"","For bank transfer:",`Bank: ${a.bank}`,`A/C Name: ${a.acName}`,`A/C No.: ${a.acNo}`,"",`After payment, share the confirmation with us via ${a.method}: ${a.contact}`,"","Thank you.","","Best regards,",`${a.manager}`,"Manager",`${e.companyData.name||"Company Name"}`,"",`P.O. Box: ${e.companyData.poBox||"N/A"}`,`CONTACTS: ${e.companyData.contacts||"N/A"}`,`EMAIL: ${e.companyData.email||"N/A"}`];o.text(m,15,t,{maxWidth:180}),o.save(`Debt_Reminder_${a.name}.pdf`)}function k(e){const a=e.debtData,o=r.book_new(),t=[["Fuel Debt Payment Reminder"],[],[`Dear ${a.name},`],[],[`This is a gentle reminder that KES ${a.amount} for fuel supplied remains unpaid.`],[],["Kindly settle the amount via Till:"],[`Buy Goods: ${a.till}`],[],["For bank transfer:"],[`Bank: ${a.bank}`],[`A/C Name: ${a.acName}`],[`A/C No.: ${a.acNo}`],[],[`After payment, share the confirmation with us via ${a.method}: ${a.contact}`],[],["Thank you."],[],["Best regards,"],[`${a.manager}`],["Manager"],[`${e.companyData.name||"Company Name"}`],[],[`P.O. Box: ${e.companyData.poBox||"N/A"}`],[`CONTACTS: ${e.companyData.contacts||"N/A"}`],[`EMAIL: ${e.companyData.email||"N/A"}`]],m=r.aoa_to_sheet(t);r.book_append_sheet(o,m,"Debt Reminder"),C(o,`Debt_Reminder_${a.name}.xlsx`)}function R(e){const a=e.debtData,o=e.companyData.name||"Company Name",t=`=== ${o} ===
Fuel Debt Payment Reminder

Dear ${a.name},

This is a gentle reminder that KES ${a.amount} for fuel supplied remains unpaid.

Kindly settle the amount via Till:
Buy Goods: ${a.till}

For bank transfer:
Bank: ${a.bank}
A/C Name: ${a.acName}
A/C No.: ${a.acNo}

After payment, share the confirmation with us via ${a.method}: ${a.contact}

Thank you.

Best regards,
${a.manager}
Manager
${o}

P.O. Box: ${e.companyData.poBox||"N/A"}
CONTACTS: ${e.companyData.contacts||"N/A"}
EMAIL: ${e.companyData.email||"N/A"}`,m=new Blob([t],{type:"text/plain"});K.saveAs(m,`Fuel_Debt_Reminder_${a.name}.txt`)}function w(e){const a=new S;let o=20;if(e.companyData.logo){const t=new Image;t.src=e.companyData.logo,a.addImage(t,"PNG",80,10,50,20),o=40}if(a.setFontSize(16),a.setTextColor("#d4af37"),a.setFont("helvetica","bold"),a.text(e.companyData.name||"Company Name",105,o,{align:"center"}),a.setTextColor("#1a3a5f"),o+=10,a.setFontSize(14),a.setFont("helvetica","bold"),a.text("Fuel Sales Report",105,o,{align:"center"}),o+=20,a.setFontSize(12),a.setFont("helvetica","normal"),a.text(`Date: ${e.salesDate}`,15,o),a.text(`Shift: ${e.shift}`,100,o),o+=15,e.pmsPumps&&e.pmsPumps.length>0){a.setFont("helvetica","bold"),a.text("Petrol (PMS) Pumps:",15,o),o+=10;const t=["Pump ID","Opening (Ksh)","Closing (Ksh)","Opening (L)","Closing (L)","Sales (L)","Sales (Ksh)"],m=e.pmsPumps.map(s=>[s.id,n(s.openingKsh),n(s.closingKsh),n(s.openingL),n(s.closingL),n(s.salesL),n(s.salesKsh)]);T(a,{startY:o,head:[t],body:m,theme:"striped",headStyles:{fillColor:[26,58,95]}}),o=a.lastAutoTable.finalY+15}if(e.agoPumps&&e.agoPumps.length>0){a.setFont("helvetica","bold"),a.text("Diesel (AGO) Pumps:",15,o),o+=10;const t=["Pump ID","Opening (Ksh)","Closing (Ksh)","Opening (L)","Closing (L)","Sales (L)","Sales (Ksh)"],m=e.agoPumps.map(s=>[s.id,n(s.openingKsh),n(s.closingKsh),n(s.openingL),n(s.closingL),n(s.salesL),n(s.salesKsh)]);T(a,{startY:o,head:[t],body:m,theme:"striped",headStyles:{fillColor:[26,58,95]}}),o=a.lastAutoTable.finalY+15}e.summary&&(a.setFont("helvetica","bold"),a.text("Daily Summary:",15,o),o+=10,a.setFont("helvetica","normal"),a.text(`Total Petrol Sales: Ksh ${n(e.summary.totalPmsSalesKsh,2)}`,15,o),o+=8,a.text(`Total Diesel Sales: Ksh ${n(e.summary.totalAgoSalesKsh,2)}`,15,o),o+=8,a.text(`Total Revenue: Ksh ${n(e.summary.totalRevenue,2)}`,15,o),o+=8,a.text(`Cash In Hand: Ksh ${n(e.summary.cashInHand,2)}`,15,o),o+=8,a.text(`Net Income: Ksh ${n(e.summary.netIncome,2)}`,15,o)),a.save("Fuel_Sales_Report.pdf")}function v(e){const a=r.book_new();if(e.pmsPumps&&e.pmsPumps.length>0){const m=[["Pump ID","Opening (Ksh)","Closing (Ksh)","Opening (L)","Closing (L)","Sales (L)","Sales (Ksh)"],...e.pmsPumps.map(l=>[l.id,l.openingKsh,l.closingKsh,l.openingL,l.closingL,l.salesL,l.salesKsh])],s=r.aoa_to_sheet(m);r.book_append_sheet(a,s,"Petrol Pumps")}if(e.agoPumps&&e.agoPumps.length>0){const m=[["Pump ID","Opening (Ksh)","Closing (Ksh)","Opening (L)","Closing (L)","Sales (L)","Sales (Ksh)"],...e.agoPumps.map(l=>[l.id,l.openingKsh,l.closingKsh,l.openingL,l.closingL,l.salesL,l.salesKsh])],s=r.aoa_to_sheet(m);r.book_append_sheet(a,s,"Diesel Pumps")}const o=[["Report Information"],[],[`Company: ${e.companyData.name||"Company Name"}`],[`Generated: ${new Date().toLocaleDateString()}`]],t=r.aoa_to_sheet(o);r.book_append_sheet(a,t,"Report Info"),C(a,"Fuel_Sales_Report.xlsx")}function H(e){let a=`=== ${e.companyData.name||"Company Name"} ===
Fuel Sales Report

`;a+=`Date: ${e.salesDate}
Shift: ${e.shift}

`,a+=`Fuel Tank Inventory:
`,a+=`Petrol (PMS) Tank: Opening: ${n(e.pmsTankOpening)} L, Closing: ${n(e.pmsTankClosing)} L
`,a+=`Diesel (AGO) Tank: Opening: ${n(e.agoTankOpening)} L, Closing: ${n(e.agoTankClosing)} L

`,a+=`Fuel Pricing:
`,a+=`Petrol (PMS): Ksh ${e.pmsPrice}/L
`,a+=`Diesel (AGO): Ksh ${e.agoPrice}/L

`,e.pmsPumps&&e.pmsPumps.length>0&&(a+=`Petrol (PMS) Pumps:
`,a+=e.pmsPumps.map(t=>`${t.id}: Sales: ${n(t.salesL)} L, ${n(t.salesKsh)} Ksh`).join(`
`),a+=`

`),e.agoPumps&&e.agoPumps.length>0&&(a+=`Diesel (AGO) Pumps:
`,a+=e.agoPumps.map(t=>`${t.id}: Sales: ${n(t.salesL)} L, ${n(t.salesKsh)} Ksh`).join(`
`),a+=`

`),e.expenses&&e.expenses.length>0&&(a+=`Daily Expenses:
`,a+=e.expenses.map(t=>`${t.desc}: ${n(t.amount)} Ksh`).join(`
`),a+=`

`),a+=`Till/Mobile Payment: ${n(e.tillPayment)} Ksh

`,e.summary&&(a+=`Daily Summary:
`,a+=`Total Petrol Sales: Ksh ${n(e.summary.totalPmsSalesKsh,2)}
`,a+=`Total Diesel Sales: Ksh ${n(e.summary.totalAgoSalesKsh,2)}
`,a+=`Total Revenue: Ksh ${n(e.summary.totalRevenue,2)}
`,a+=`Till/Mobile Payment: Ksh ${n(e.tillPayment,2)}
`,a+=`Cash In Hand: Ksh ${n(e.summary.cashInHand,2)}
`,a+=`Total Expenses: Ksh ${n(e.summary.totalExpenses,2)}
`,a+=`Net Income: Ksh ${n(e.summary.netIncome,2)}`);const o=new Blob([a],{type:"text/plain"});K.saveAs(o,"Fuel_Sales_Report.txt")}function Y(e,a="save"){var u,x,d,h,$,D,g,f,p,N;const o=new S;let t=20;if((u=e.companyData)!=null&&u.logo)try{const i=new Image;i.crossOrigin="anonymous";let y=e.companyData.logo;y.startsWith("data:")?(o.addImage(y,"PNG",15,10,50,30),t=50):console.warn("External logo URLs not supported in PDF export. Please upload logo as file.")}catch(i){console.warn("Could not load company logo for PDF:",i)}o.setFontSize(24),o.setFont("helvetica","bold"),o.setTextColor("#000000"),o.text("INVOICE",15,t),t+=15,(x=e.companyData)!=null&&x.name&&(o.setFontSize(16),o.setFont("helvetica","bold"),o.text(e.companyData.name,15,t),t+=10),o.setFontSize(11),o.setFont("helvetica","normal");let m="";(d=e.companyData)!=null&&d.poBox&&(m+=`P.O. Box: ${e.companyData.poBox}`),(h=e.companyData)!=null&&h.contacts&&(m&&(m+=" "),m+=e.companyData.contacts),m&&(o.text(m,15,t),t+=8),($=e.companyData)!=null&&$.email&&(o.text(e.companyData.email,15,t),t+=8),t+=10,o.setFont("helvetica","bold"),o.text("Bill To:",15,t),t+=8,o.setFont("helvetica","normal"),e.customerName&&(o.text(e.customerName,15,t),t+=6);const s=120;let l=t-20;if(o.setFont("helvetica","bold"),o.text("Invoice #:",s,l),o.setFont("helvetica","normal"),o.text(e.invoiceNumber||"",s+25,l),l+=8,o.setFont("helvetica","bold"),o.text("Date:",s,l),o.setFont("helvetica","normal"),o.text(e.invoiceDate||"",s+15,l),t+=15,e.invoiceItems&&e.invoiceItems.length>0){const y=["Description",e.quantityLabel||"Qty (DAYS)","Unit Price","Total"],b=e.invoiceItems.map(P=>[P.desc||"",P.qty||0,`Ksh${n(P.price,0)}`,`Ksh${n(P.total,0)}`]);T(o,{startY:t,head:[y],body:b,theme:"plain",headStyles:{fillColor:!1,textColor:[0,0,0],fontSize:11,fontStyle:"bold",lineWidth:.1,lineColor:[0,0,0]},bodyStyles:{fontSize:10,lineWidth:.1,lineColor:[0,0,0]},columnStyles:{0:{cellWidth:80},1:{cellWidth:30,halign:"center"},2:{cellWidth:40,halign:"right"},3:{cellWidth:40,halign:"right"}}}),t=o.lastAutoTable.finalY+15}o.setFont("helvetica","bold"),o.setFontSize(12),o.text(` Total Due: Ksh${n(e.totalDue||0,0)}`,120,t),t+=20,o.setFont("helvetica","bold"),o.text("Payment Should Be Made Through",15,t),t+=10,o.setFont("helvetica","normal"),(D=e.companyData)!=null&&D.bankName&&(o.text(`BANK: ${e.companyData.bankName}`,15,t),t+=8),(g=e.companyData)!=null&&g.branchName&&(o.text(`BRANCH: ${e.companyData.branchName}`,15,t),t+=8),(f=e.companyData)!=null&&f.accountHolder&&(o.text(e.companyData.accountHolder,15,t),t+=8),(p=e.companyData)!=null&&p.accountNumber&&(o.text(`ACCOUNT NO: ${e.companyData.accountNumber}`,15,t),t+=8),t+=15,o.text("Signature:………………………….",15,t);const c=`Invoice_${e.invoiceNumber}_${((N=e.customerName)==null?void 0:N.replace(/\s+/g,"_"))||"Customer"}.pdf`;if(a==="blob")return o.output("blob");o.save(c)}function M(e){var d,h,$,D,g,f,p,N,i,y;const a=r.book_new(),o=[["INVOICE"],[]];(d=e.companyData)!=null&&d.name&&o.push([e.companyData.name]);let t="";(h=e.companyData)!=null&&h.poBox&&(t+=`P.O. Box: ${e.companyData.poBox}`),($=e.companyData)!=null&&$.contacts&&(t&&(t+=" "),t+=e.companyData.contacts),t&&o.push([t]),(D=e.companyData)!=null&&D.email&&o.push([e.companyData.email]),o.push([]),o.push(["Bill To:",e.customerName||""]),o.push([`Invoice #: ${e.invoiceNumber}`]),o.push([`Date: ${e.invoiceDate}`]),o.push([]);const m=e.quantityLabel||"Qty (DAYS)",s=((g=e.invoiceItems)==null?void 0:g.length)>0?[["Description",m,"Unit Price","Total"],...e.invoiceItems.map(b=>[b.desc||"",b.qty||0,`Ksh${n(b.price,0)}`,`Ksh${n(b.total,0)}`])]:[["No items added"]],l=[[],[` Total Due: Ksh${n(e.totalDue||0,0)}`],[],["Payment Should Be Made Through"]];(f=e.companyData)!=null&&f.bankName&&l.push([`BANK: ${e.companyData.bankName}`]),(p=e.companyData)!=null&&p.branchName&&l.push([`BRANCH: ${e.companyData.branchName}`]),(N=e.companyData)!=null&&N.accountHolder&&l.push([e.companyData.accountHolder]),(i=e.companyData)!=null&&i.accountNumber&&l.push([`ACCOUNT NO: ${e.companyData.accountNumber}`]),l.push([]),l.push(["Signature:…………………………."]);const c=[...o,...s,...l],u=r.aoa_to_sheet(c);u["!cols"]=[{width:25},{width:12},{width:18},{width:18}],r.book_append_sheet(a,u,"Invoice");const x=`Invoice_${e.invoiceNumber}_${((y=e.customerName)==null?void 0:y.replace(/\s+/g,"_"))||"Customer"}.xlsx`;C(a,x)}function z(e){var l,c,u,x,d,h,$,D,g,f;let a="";a+=`INVOICE
`,(l=e.companyData)!=null&&l.name&&(a+=`${e.companyData.name}
`);let o="";(c=e.companyData)!=null&&c.poBox&&(o+=`P.O. Box: ${e.companyData.poBox}`),(u=e.companyData)!=null&&u.contacts&&(o&&(o+=" "),o+=e.companyData.contacts),o&&(a+=`${o}
`),(x=e.companyData)!=null&&x.email&&(a+=`${e.companyData.email}
`),a+=`
`,a+=`Bill To: ${e.customerName||""}
`,a+=`Invoice #: ${e.invoiceNumber}
`,a+=`Date: ${e.invoiceDate}

`;const t=e.quantityLabel||"Qty (DAYS)";a+=`${"Description".padEnd(40)} ${t.padEnd(12)} ${"Unit Price".padEnd(15)} ${"Total".padEnd(15)}
`,a+=`${"-".repeat(85)}
`,((d=e.invoiceItems)==null?void 0:d.length)>0?e.invoiceItems.forEach(p=>{const N=(p.desc||"").padEnd(40),i=(p.qty||0).toString().padEnd(12),y=`Ksh${n(p.price,0)}`.padEnd(15),b=`Ksh${n(p.total,0)}`.padEnd(15);a+=`${N} ${i} ${y} ${b}
`}):a+=`No items added
`,a+=`
`,a+=` Total Due: Ksh${n(e.totalDue||0,0)}

`,a+=`Payment Should Be Made Through
`,(h=e.companyData)!=null&&h.bankName&&(a+=`BANK: ${e.companyData.bankName}
`),($=e.companyData)!=null&&$.branchName&&(a+=`BRANCH: ${e.companyData.branchName}
`),(D=e.companyData)!=null&&D.accountHolder&&(a+=`${e.companyData.accountHolder}
`),(g=e.companyData)!=null&&g.accountNumber&&(a+=`ACCOUNT NO: ${e.companyData.accountNumber}
`),a+=`
Signature:………………………….`;const m=new Blob([a],{type:"text/plain;charset=utf-8"}),s=`Invoice_${e.invoiceNumber}_${((f=e.customerName)==null?void 0:f.replace(/\s+/g,"_"))||"Customer"}.txt`;K.saveAs(m,s)}export{E as a,R as b,O as c,I as d,k as e,B as f,M as g,Y as h,z as i,v as j,w as k,H as l};
