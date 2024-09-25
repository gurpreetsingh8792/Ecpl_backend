const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();

const Project = require("../models/project");
const DieselAttendance = require("../models/DieselAttendance");
const DieselStock = require("../models/DieselStock");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const MaterialReceipt = require("../models/MaterialReceipt");
const BulkMaterialReceived = require("../models/BulkMaterialReceived");
const MaterialConsumed = require("../models/MaterialConsumed");
const Product = require("../models/Product");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
console.log({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

exports.generatePDF = async (req, res) => {
  try {
    const { projectId, date } = req.params;
    console.log("Received projectId:", projectId);
    const project = await Project.findById(projectId)
      .populate({
        path: "labours",
        populate: { path: "contractor" },
      })
      .populate("petiThekedars");

    if (!project) {
      return res.status(404).send("Project not found");
    }

    const getInitials = (name) => {
      const words = name.split(" ");
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      } else {
        return words.map((word) => word.charAt(0).toUpperCase()).join("");
      }
    };

    let hasOvertime = false;
    let hasHalfday = false;

    project.labours.forEach((labour) => {
      const overtime = labour.overtime.find(
        (ot) => ot.date.toISOString().split("T")[0] === date
      );

      if (overtime) {
        hasOvertime = true;
      }
    });

    project.labours.forEach((labour) => {
      const halfday = labour.halfDay.find(
        (ot) => ot.date.toISOString().split("T")[0] === date
      );

      if (halfday) {
        hasHalfday = true;
      }
    });

    const contractorInitials = new Set(
      project.labours.map((labour) =>
        labour.contractor ? getInitials(labour.contractor.name) : "LL"
      )
    );

    const contractorData = {};

    project.labours.forEach((labour) => {
      const contractorName = labour.contractor
        ? labour.contractor.name
        : "Local Labour";

      if (!contractorData[contractorName]) {
        contractorData[contractorName] = {
          mason: 0,
          beldar: 0,
          coolie: 0,
          total: 0,
        };
      }

      const attendance = labour.attendance.find(
        (att) => att.date.toISOString().split("T")[0] === date
      );

      if (attendance && attendance.type === "present") {
        if (labour.designation === "koolie") {
          contractorData[contractorName].coolie++;
        } else {
          contractorData[contractorName][labour.designation]++;
        }
        contractorData[contractorName].total++;
      }
    });

    console.log(
      `Contractor Initials: ${Array.from(contractorInitials).join(", ")}`
    );

    const htmlTemplate = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            position: relative;
          }
          h1 {
            text-align: center;
            color: #333;
          }
          h3 {
            text-align: center;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table, th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
          }
          th {
            background-color: #f2f2f2;
          }
          .present {
            background-color: #d4edda !important;
            color: #155724 !important;
            font-weight: bold;
          }
          .absent {
            background-color: #f8d7da !important;
            color: #721c24 !important;
            font-weight: bold;
          }
          .watermark {
            position: fixed;
            bottom: 13%;
            left: 5%;
            transform: translate(-50%, 50%) rotate(-50deg);
            font-size: 60px;
            color: rgba(0, 0, 0, 0.1);
            white-space: nowrap;
            z-index: 9999;
            pointer-events: none;
            user-select: none;
            width: 0%; 
            text-align: left;
          }
          .project-name {
            color: #8B0000; /* Dark Red */
          }
        </style>
      </head>
      <body>
        <div class="watermark">Engineer Constructions Private Limited</div>
        <h1>Attendance Report for <span class="project-name">${
          project.name
        }</span></h1>
        <h3>Date: ${date}</h3>
        <h2>Labour Attendance</h2>
        <table>
          <thead>
            <tr>
              <th rowspan="2">S.No.</th>
              <th rowspan="2">Labour Name</th>
              ${Array.from(contractorInitials)
                .map((initial) => `<th rowspan="2">${initial}</th>`)
                .join("")}
              ${hasHalfday ? '<th rowspan="2">Half Day</th>' : ""}
              ${hasOvertime ? '<th rowspan="2">Overtime</th>' : ""}
            </tr>
          </thead>
          <tbody>
            ${project.labours
              .map((labour, index) => {
                const attendance = labour.attendance.find(
                  (att) => att.date.toISOString().split("T")[0] === date
                );

                const attendanceMark =
                  attendance && attendance.type === "present"
                    ? labour.designation === "koolie"
                      ? "C"
                      : labour.designation.charAt(0).toUpperCase()
                    : "-"; // Mark as '-' if absent

                const attendanceClass =
                  attendance && attendance.type === "present"
                    ? "present"
                    : "absent";

                const overtime = labour.overtime.find(
                  (ot) => ot.date.toISOString().split("T")[0] === date
                );

                let overtimeTime = "";
                if (overtime) {
                  if (overtime.hours > 0) {
                    const hours =
                      overtime.hours === 1
                        ? `${overtime.hours} hour`
                        : `${overtime.hours} hours`;
                    const minutes = overtime.minutes
                      ? `${overtime.minutes} minutes`
                      : "";
                    overtimeTime = `${hours}${
                      hours && minutes ? " " : ""
                    }${minutes}`;
                  } else if (overtime.minutes > 0) {
                    overtimeTime = `${overtime.minutes} minutes`;
                  }
                }

                const halfday = labour.halfDay.find(
                  (ot) => ot.date.toISOString().split("T")[0] === date
                );

                let halfdayTime = "";
                if (halfday) {
                  if (halfday.hours > 0) {
                    const hours =
                      halfday.hours === 1
                        ? `${halfday.hours} hour`
                        : `${halfday.hours} hours`;
                    const minutes = halfday.minutes
                      ? `${halfday.minutes} minutes`
                      : "";
                    halfdayTime = `${hours}${
                      hours && minutes ? " " : ""
                    }${minutes}`;
                  } else if (halfday.minutes > 0) {
                    halfdayTime = `${halfday.minutes} minutes`;
                  }
                }

                return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${labour.name}</td>
                  ${Array.from(contractorInitials)
                    .map((initial) => {
                      const isLabourAssigned = labour.contractor
                        ? getInitials(labour.contractor.name) === initial
                        : initial === "LL";
                      return `
                      <td class="${isLabourAssigned ? attendanceClass : ""}">
                        ${
                          isLabourAssigned
                            ? attendance
                              ? attendanceMark
                              : ""
                            : ""
                        }
                      </td>`;
                    })
                    .join("")}
                  ${hasHalfday ? `<td>${halfdayTime}</td>` : ""}
                  ${hasOvertime ? `<td>${overtimeTime}</td>` : ""}
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

        <h2>Attendance Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Contractor Name</th>
              <th>Mason</th>
              <th>Beldar</th>
              <th>Coolie</th>
              
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(contractorData)
              .map((contractorName) => {
                const data = contractorData[contractorName];
                return `
                <tr>
                  <td>${contractorName}</td>
                  <td>${data.mason > 0 ? data.mason : "-"}</td>
                  <td>${data.beldar > 0 ? data.beldar : "-"}</td>
                  <td>${data.coolie > 0 ? data.coolie : "-"}</td>
                  
                  <td>${data.total}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

        <h2>Peti Thekedar Attendance</h2>
        <table>
          <tr>
            <th>Sno.</th>
            <th>Peti Thekedar Name</th>
            <th>Mason</th>
            <th>Beldar</th>
            <th>Coolie</th>
            
            <th>Total</th>
          </tr>
          ${project.petiThekedars
            .map((peti, index) => {
              const dailyCount = peti.dailyCounts.find(
                (count) => count.date.toISOString().split("T")[0] === date
              );

              const masonCount =
                dailyCount && dailyCount.masonCount > 0
                  ? dailyCount.masonCount
                  : 0;
              const coolieCount =
                dailyCount && dailyCount.coolieCount > 0
                  ? dailyCount.coolieCount
                  : 0;
              const beldarCount =
                dailyCount && dailyCount.beldarCount > 0
                  ? dailyCount.beldarCount
                  : 0;
              const totalCount = masonCount + coolieCount + beldarCount;

              const masonClass = masonCount > 0 ? "present" : "absent";
              const coolieClass = coolieCount > 0 ? "present" : "absent";
              const beldarClass = beldarCount > 0 ? "present" : "absent";

              return `
              <tr>
                <td>${index + 1}</td>
                <td>${peti.name}</td>
                <td class="${masonClass}">${
                masonCount > 0 ? masonCount : "-"
              }</td>
               <td class="${beldarClass}">${
                beldarCount > 0 ? beldarCount : "-"
              }</td>
                <td class="${coolieClass}">${
                coolieCount > 0 ? coolieCount : "-"
              }</td>
               
                <td>${totalCount}</td>
              </tr>
            `;
            })
            .join("")}
        </table>
      </body>
    </html>
  `;

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

    // Instead of saving to disk, get the PDF as a buffer
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    const fileName = `attendance_report_${project.name}_${date}.pdf`;
    const bucketName = process.env.S3_BUCKET_NAME;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer, // Now correctly using the pdfBuffer
      ContentType: "application/pdf",
    };

    // Upload the file to S3 using PutObjectCommand
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Return the download URL
    res.json({ downloadUrl: fileUrl });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Server Error");
  }
};

exports.generateRangePDF = async (req, res) => {
  try {
    // Use req.query instead of req.body for GET requests
    const { projectId, workerType, workerId, fromDate, toDate } = req.query;

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res.status(400).send("Invalid date range");
    }

    // Fetch the project and associated data
    const project = await Project.findById(projectId)
      .populate({
        path: "labours",
        populate: { path: "contractor" },
      })
      .populate("petiThekedars")
      .populate("contractors");

    if (!project) {
      return res.status(404).send("Project not found");
    }

    // Generate the date columns for the range (only day part)
    const dateColumns = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dateColumns.push(new Date(dt).toISOString().split("T")[0]); // use full date string instead of just day
    }

    // Define the template for the PDF based on worker type
    let htmlTemplate = "";

    if (workerType === "labour") {
      // Find the selected labour
      const selectedLabour = project.labours.find(
        (labour) => labour._id.toString() === workerId
      );

      if (!selectedLabour) {
        return res.status(404).send("Labour not found");
      }

      let totalWorkingDays = 0;
      let totalOvertimeHours = 0;
      let totalOvertimeMinutes = 0;
      let totalHalfdayHours = 0;
      let totalHalfdayMinutes = 0;

      const labourAttendanceData = dateColumns.map((date) => {
        const attendance = selectedLabour.attendance.find(
          (att) => new Date(att.date).toISOString().split("T")[0] === date
        );

        let attendanceStatus = "-";
        let overtimeDetails = "";
        let halfdayDetails = ""; // Initialize halfDayDetails here

        if (attendance) {
          attendanceStatus =
            attendance.type === "present"
              ? "Present"
              : attendance.type === "halfday"
              ? "Half Day"
              : "Absent";

          if (attendance.type === "present") {
            totalWorkingDays++;
          }

          const halfday = selectedLabour.halfDay.find(
            (ot) => new Date(ot.date).toISOString().split("T")[0] === date
          );

          if (halfday) {
            const hours = halfday.hours || 0;
            const minutes = halfday.minutes || 0;

            totalHalfdayHours += hours;
            totalHalfdayMinutes += minutes;

            if (hours > 0) {
              halfdayDetails = `${hours} hour${hours > 1 ? "s" : ""}`;
              if (minutes > 0) {
                halfdayDetails += ` ${minutes} minute${minutes > 1 ? "s" : ""}`;
              }
            } else if (minutes > 0) {
              halfdayDetails = `${minutes} minute${minutes > 1 ? "s" : ""}`;
            }
          }

          const overtime = selectedLabour.overtime.find(
            (ot) => new Date(ot.date).toISOString().split("T")[0] === date
          );

          if (overtime) {
            const hours = overtime.hours || 0;
            const minutes = overtime.minutes || 0;

            totalOvertimeHours += hours;
            totalOvertimeMinutes += minutes;

            if (hours > 0) {
              overtimeDetails = `${hours} hour${hours > 1 ? "s" : ""}`;
              if (minutes > 0) {
                overtimeDetails += ` ${minutes} minute${
                  minutes > 1 ? "s" : ""
                }`;
              }
            } else if (minutes > 0) {
              overtimeDetails = `${minutes} minute${minutes > 1 ? "s" : ""}`;
            }
          }
        }

        return { date, attendanceStatus, overtimeDetails, halfdayDetails };
      });

      totalOvertimeHours += Math.floor(totalOvertimeMinutes / 60);
      totalOvertimeMinutes = totalOvertimeMinutes % 60;
      htmlTemplate = `
<html>
  <head>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        margin: 10px; /* Reduced margin */
        padding: 0;
        background-color: #f2f2f2; /* Light shade of white */
        color: #222831; /* Dark gray for text */
        font-size: 14px; /* Reduced font size */
      }
      
      .header-row1 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px; /* Reduced margin */
        font-size: 12px; /* Slightly reduced font size */
      }
      .header-row1 div {
        margin-right: 12px; /* Reduced space between items */
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px; /* Reduced margin */
        color: #222831; 
        font-size: 12px; /* Reduced font size */
      }
      .header-row div {
        font-size: 12px;
      }
      h1 {
        text-align: center;
        font-size: 20px; /* Reduced font size */
        margin-bottom: 15px; /* Reduced margin */
        color: black; 
      }
      table {
        width: 90%;
        border-collapse: collapse;
        table-layout: fixed;
          margin: 0 auto; 
      }
      th, td {
        padding: 4px; /* Reduced padding */
        text-align: center;
        border: 1px solid #393e46; /* Medium dark gray */
        font-size: 12px; /* Reduced font size */
        word-wrap: break-word;
      }
      th {
        background-color: #f96d00; /* Bright orange for table headers */
        font-weight: bold;
      }
      td.present {
        background-color: #d4edda; /* Light green for present */
        color: #155724; /* Dark green for present text */
        font-weight: bold;
      }
      td.absent {
        background-color: #f8d7da; /* Light red for absent */
        color: #721c24; /* Dark red for absent text */
        font-weight: bold;
      }
      .total-row td {
        font-weight: bold;
        background-color: #e0e0e0; /* Light gray for total row */
        color: #222831; /* Dark gray for total text */
      }
      .company-name {
        font-size: 22px; /* Reduced font size */
        color: black;
        text-align: center;
        margin-bottom: 7px;
        margin-tottom: 5px;
        text-transform: uppercase;
        font-weight: bold; 
      }
      .footer {
        margin-top: 10px;
        text-align: right;
        font-size: 8px; /* Reduced font size */
        color: #393e46; /* Medium dark gray for footer */
      }
      .table-head {
        background: #e0e0e0; /* Light gray background */
        color: black;
      }
        .watermark {
            position: fixed;
            bottom: 13%;
            left: 5%;
            transform: translate(-50%, 50%) rotate(-50deg);
            font-size: 60px;
            color: rgba(0, 0, 0, 0.1);
            white-space: nowrap;
            z-index: 9999;
            pointer-events: none;
            user-select: none;
            width: 0%; 
            text-align: left;
          }
        .container {
        width: 90%;
        margin: 0 auto; /* Center the container horizontally */
      }
    </style>
  </head>
   <body>
   <div class="watermark">Engineer Constructions Private Limited</div>
    <div class="company-name">Engineer Constructions Private Limited</div>
    <h1>Daily Attendance Card of Labour</h1>
    <div class="container">
      <div class="header-row1">
        <div><strong>Labour Name:</strong> ${selectedLabour.name}</div>
        <div><strong>Designation:</strong> ${selectedLabour.designation}</div>
        <div><strong>Month:</strong> ${new Date(fromDate).toLocaleString(
          "en-GB",
          {
            month: "long",
          }
        )}</div>
      </div>
      <div class="header-row">
        <div><strong>Contractor:</strong> ${
          selectedLabour.contractor
            ? selectedLabour.contractor.name
            : "Local Labour"
        }</div>
        <div><strong>Date: </strong>From ${new Date(
          fromDate
        ).toLocaleDateString("en-GB")} To ${new Date(toDate).toLocaleDateString(
        "en-GB"
      )}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr class="table-head">
          <th>Date</th>
          <th>Attendance</th>
          <th>Overtime</th>
          <th>Half Day</th>
          
        </tr>
      </thead>
      <tbody>
        ${labourAttendanceData
          .map(
            (data) => `
          <tr>
            <td>${new Date(data.date).toLocaleDateString("en-GB")}</td>
            <td class="${data.attendanceStatus.toLowerCase()}">${
              data.attendanceStatus
            }</td>
            <td>${data.overtimeDetails || "-"}</td>
            <td>${data.halfdayDetails || "-"}</td>
            
          </tr>
        `
          )
          .join("")}
        <tr class="total-row">
          <td>Total</td>
          <td>${totalWorkingDays} days present</td>
          <td>${totalOvertimeHours} hour${
        totalOvertimeHours > 1 ? "s" : ""
      } ${totalOvertimeMinutes} minute${
        totalOvertimeMinutes > 1 ? "s" : ""
      }</td>
      <td>${totalHalfdayHours} hour${
        totalHalfdayHours > 1 ? "s" : ""
      } ${totalHalfdayMinutes} minute${totalHalfdayMinutes > 1 ? "s" : ""}</td>
     
        </tr>
      </tbody>
    </table>
    <div class="container">
      <div class="footer">
        Report generated on ${new Date().toLocaleDateString("en-GB")}
      </div>
    </div>
  </body>
</html>
`;
    } else if (workerType === "contractor") {
      let grandTotal = { mason: 0, beldar: 0, coolie: 0, total: 0 };

      const contractorAttendanceData = dateColumns.map((date) => {
        const labourCounts = { mason: 0, beldar: 0, coolie: 0 };

        project.labours
          .filter((labour) => {
            if (workerId === "local") {
              return !labour.contractor; // No contractor means Local Labour
            } else {
              return (
                labour.contractor &&
                labour.contractor._id.toString() === workerId
              ); // Specific contractor
            }
          })
          .forEach((labour) => {
            const attendance = labour.attendance.find(
              (att) => new Date(att.date).toISOString().split("T")[0] === date
            );

            if (attendance && attendance.type === "present") {
              const designation =
                labour.designation === "koolie" ? "coolie" : labour.designation;
              labourCounts[designation]++;
            }
          });

        labourCounts.total =
          labourCounts.mason + labourCounts.beldar + labourCounts.coolie;

        // Accumulate to grand total
        grandTotal.mason += labourCounts.mason;
        grandTotal.beldar += labourCounts.beldar;
        grandTotal.coolie += labourCounts.coolie;
        grandTotal.total += labourCounts.total;

        return labourCounts;
      });

      const contractorName =
        workerId === "local"
          ? "Local Labour"
          : project.contractors.find(
              (contractor) => contractor._id.toString() === workerId
            )?.name || "Unknown Contractor";

      htmlTemplate = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 10px;
                padding: 0;
                background-color: #f2f2f2;
                color: #222831;
                font-size: 14px;
              }
              .header-row1 {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                font-size: 12px;
              }
              .container {
                width: 90%;
                margin: 0 auto;
              }
              .header-row1 div {
                margin-right: 12px;
              }
              .company-name {
                font-size: 22px;
                color: black;
                text-align: center;
                margin-bottom: 7px;
                margin-tottom: 5px;
                text-transform: uppercase;
                font-weight: bold; 
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                color: #222831;
                font-size: 12px;
              }
              h1 {
                text-align: center;
                font-size: 20px;
                margin-bottom: 15px;
                color: black; 
              }
              table {
                width: 90%;
                border-collapse: collapse;
                table-layout: fixed;
                margin: 0 auto;
              }
              th, td {
                padding: 4px;
                text-align: center;
                border: 1px solid #ddd;
                font-size: 12px;
                word-wrap: break-word;
              }
              th {
                background-color: #f4f4f4;
                font-weight: bold;
              }
              .watermark {
                position: fixed;
                bottom: 13%;
                left: 5%;
                transform: translate(-50%, 50%) rotate(-50deg);
                font-size: 60px;
                color: rgba(0, 0, 0, 0.1);
                white-space: nowrap;
                z-index: 9999;
                pointer-events: none;
                user-select: none;
                width: 0%;
                text-align: left;
              }
              .footer {
                margin-top: 10px;
                text-align: right;
                font-size: 8px;
                color: #393e46;
              }
            </style>
          </head>
          <body>
            <div class="watermark">Engineer Constructions Private Limited</div>
            <div class="company-name">Engineer Constructions Private Limited</div>
            <h1>Daily Attendance Card of Contractor</h1>
            <div class="container">
              <div class="header-row1">
                <div><strong>Contractor Name:</strong> ${contractorName}</div>
                <div><strong>Month:</strong> ${new Date(
                  fromDate
                ).toLocaleString("en-GB", {
                  month: "long",
                })}</div>
              </div>
              <div class="header-row">
                <div></div>
                <div><strong>Date: </strong>From ${new Date(
                  fromDate
                ).toLocaleDateString("en-GB")} To ${new Date(
        toDate
      ).toLocaleDateString("en-GB")}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mason</th>
                  <th>Beldar</th>
                  <th>Coolie</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${contractorAttendanceData
                  .map(
                    (data, index) => `
                  <tr>
                    <td>${new Date(dateColumns[index]).toLocaleDateString(
                      "en-GB"
                    )}</td>
                    <td>${data.mason}</td>
                    <td>${data.beldar}</td>
                    <td>${data.coolie}</td>
                    <td>${data.total}</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr>
                  <td><strong>Total</strong></td>
                  <td><strong>${grandTotal.mason}</strong></td>
                  <td><strong>${grandTotal.beldar}</strong></td>
                  <td><strong>${grandTotal.coolie}</strong></td>
                  <td><strong>${grandTotal.total}</strong></td>
                </tr>
              </tbody>
            </table>
            <div class="container">
            <div class="footer">
              Report generated on ${new Date().toLocaleDateString("en-GB")}
            </div>
            </div>
          </body>
        </html>
      `;
    } else if (workerType === "petiThekedar") {
      // Find the selected Peti Thekedar
      const selectedPetiThekedar = project.petiThekedars.find(
        (peti) => peti._id.toString() === workerId
      );

      if (!selectedPetiThekedar) {
        return res.status(404).send("Peti Thekedar not found");
      }

      let grandTotal = { mason: 0, beldar: 0, coolie: 0 };

      // Generate Peti Thekedar Attendance Data
      const petiAttendanceData = dateColumns.map((date) => {
        const dailyCount = selectedPetiThekedar.dailyCounts.find(
          (count) => new Date(count.date).toISOString().split("T")[0] === date
        );

        const counts = {
          mason: dailyCount ? dailyCount.masonCount : 0,
          beldar: dailyCount ? dailyCount.beldarCount : 0,
          coolie: dailyCount ? dailyCount.coolieCount : 0,
        };

        // Accumulate to grand total
        grandTotal.mason += counts.mason;
        grandTotal.beldar += counts.beldar;
        grandTotal.coolie += counts.coolie;

        return counts;
      });

      htmlTemplate = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 10px;
                padding: 0;
                background-color: #f2f2f2;
                color: #222831;
                font-size: 14px;
              }
              
              .container {
                width: 90%;
                margin: 0 auto;
              }
                .header-row1 {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                font-size: 12px;
              }
              .header-row1 div {
                margin-right: 12px;
              }
                .header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                color: #222831;
                font-size: 12px;
              }
              .company-name {
                font-size: 22px;
                color: black;
                text-align: center;
                margin-bottom: 7px;
                margin-tottom: 5px;
                text-transform: uppercase;
                font-weight: bold; 
              }
                h1 {
                text-align: center;
                font-size: 20px;
                margin-bottom: 15px;
                color: black; 
              }
                .watermark {
                position: fixed;
                bottom: 13%;
                left: 5%;
                transform: translate(-50%, 50%) rotate(-50deg);
                font-size: 60px;
                color: rgba(0, 0, 0, 0.1);
                white-space: nowrap;
                z-index: 9999;
                pointer-events: none;
                user-select: none;
                width: 0%;
                text-align: left;
              }
              
              
              table {
                width: 90%;
                border-collapse: collapse;
                table-layout: fixed;
                margin: 0 auto;
              }
              th, td {
                padding: 4px;
                text-align: center;
                border: 1px solid #ddd;
                font-size: 12px;
                word-wrap: break-word;
              }
              th {
                background-color: #f4f4f4;
                font-weight: bold;
              }
              
              .footer {
                margin-top: 10px;
                text-align: right;
                font-size: 8px;
                color: #393e46;
              }
            </style>
          </head>
          <body>
            <div class="watermark">Engineer Constructions Private Limited</div>
            <div class="company-name">Engineer Constructions Private Limited</div>
            <h1>Daily Attendance Card of Peti Thekedar</h1>
            <div class="container">
              <div class="header-row1">
                <div><strong>Peti Thekedar Name:</strong> ${
                  selectedPetiThekedar.name
                }</div>
                <div><strong>Month:</strong> ${new Date(
                  fromDate
                ).toLocaleString("en-GB", {
                  month: "long",
                })}</div>
              </div>
              <div class="header-row">
                <div></div>
                <div><strong>Date: </strong>From ${new Date(
                  fromDate
                ).toLocaleDateString("en-GB")} To ${new Date(
        toDate
      ).toLocaleDateString("en-GB")}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mason</th>
                  <th>Beldar</th>
                  <th>Coolie</th>
                   <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${petiAttendanceData
                  .map((data, index) => {
                    const total = data.mason + data.beldar + data.coolie; // Calculate total
                    return `
                    <tr>
                      <td>${new Date(dateColumns[index]).toLocaleDateString(
                        "en-GB"
                      )}</td>
                      <td>${data.mason}</td>
                      <td>${data.beldar}</td>
                      <td>${data.coolie}</td>
                      <td>${total}</td> <!-- Display total for each date -->
                    </tr>
                    `;
                  })
                  .join("")}
                <tr>
                  <td><strong>Total</strong></td>
                  <td><strong>${grandTotal.mason}</strong></td>
                  <td><strong>${grandTotal.beldar}</strong></td>
                  <td><strong>${grandTotal.coolie}</strong></td>
                   <td><strong>${
                     grandTotal.mason + grandTotal.beldar + grandTotal.coolie
                   }</strong></td>
                </tr>
              </tbody>
            </table>
            <div class="container">
            <div class="footer">
              Report generated on ${new Date().toLocaleDateString("en-GB")}
            </div>
            </div>
          </body>
        </html>
      `;
    } else {
      return res.status(400).send("Invalid worker type");
    }

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

    // Instead of saving to disk, get the PDF as a buffer
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    const fileName = `attendance_report_${workerType}_${fromDate}_to_${toDate}.pdf`;
    const bucketName = process.env.S3_BUCKET_NAME;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer, // Now correctly using the pdfBuffer
      ContentType: "application/pdf",
    };

    // Upload the file to S3 using PutObjectCommand
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Return the download URL
    res.json({ downloadUrl: fileUrl });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Server Error");
  }
};

exports.generateDieselReportPDF = async (req, res) => {
  const { projectId, date } = req.params;

  try {
    // Fetch the project details (including name)
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectname = project.name;
    const projectName = project.name.replace(/\s+/g, "_").toLowerCase();

    // Fetch Diesel Stock for the project on the given date
    const dieselStock = await DieselStock.findOne({
      projectId,
      date: new Date(date),
    });

    if (!dieselStock) {
      return res
        .status(404)
        .json({ message: "No diesel stock found for this date" });
    }

    // Fetch Diesel Attendance (diesel received by each vehicle)
    const dieselAttendance = await DieselAttendance.find({
      projectId,
      date: new Date(date),
    }).populate("vehicleId");

    // Fetch Vehicles and Drivers
    const vehicleDetails = await Promise.all(
      dieselAttendance.map(async (attendance) => {
        const vehicle = await Vehicle.findById(attendance.vehicleId);
        const driver = await Driver.findOne({ vehicles: vehicle._id });
        return {
          vehicleName: vehicle.name,
          vehicleNumber: vehicle.number,
          driverName: driver ? driver.name : "-",
          dieselReceived: attendance.totalReceived,
        };
      })
    );

    const totalDieselReceived = vehicleDetails.reduce(
      (total, detail) => total + detail.dieselReceived,
      0
    );

    const openingBalance = dieselStock.openingBalance;
    const closingBalance = dieselStock.closingBalance;

    // Puppeteer code to generate PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .company-name {
              font-size: 25px;
              text-align: center;
              margin-bottom: 7px;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-weight: bold; 
            }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 15px;
              color: black; 
            }
            .watermark {
              position: fixed;
              bottom: 13%;
              left: 5%;
              transform: translate(-50%, 50%) rotate(-50deg);
              font-size: 60px;
              color: rgba(0, 0, 0, 0.1);
              white-space: nowrap;
              z-index: 9999;
              pointer-events: none;
              user-select: none;
              width: 0%;
              text-align: left;
            }
            .footer {
              margin-top: 10px;
              text-align: right;
              font-size: 8px;
              color: #393e46;
            }
              .dark-red { color: #8B0000; }
              .red-text { color: red; font-weight: bold; }
            .header-row1 {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
              font-size: 12px;
            }
            .header-row1 div {
              margin-right: 12px;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
              color: #222831;
              font-size: 12px;
            }
            .container { margin: 0 auto; max-width: 800px; padding: 20px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
            .table th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
        <div class="watermark">Engineer Constructions Private Limited</div>
        <div class="company-name">Engineer Constructions Private Limited</div>
        <h1>Daily Diesel Report of <span class="dark-red">${projectname}</span></h1>
        <h1>Date - ${new Date(date).toLocaleDateString()}</h1>
        <div class="container">

          <div class="header-row1">
            <div><strong>Last Fuel Recieved:
              <span class="dark-red">${
                dieselStock.totalFuelAdded
              } L</span></strong> 
            </div>
            <div><strong>Opening Balance:
              <span class="dark-red">${openingBalance} L</span></strong> 
            </div>
          </div>
          <div class="header-row">
            <div><strong>Received On:</strong> ${new Date(
              dieselStock.date
            ).toLocaleDateString()}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Vehicle Name</th>
                <th>Vehicle Number</th>
                <th>Driver Assigned</th>
                <th>Fuel Issued (L)</th>
              </tr>
            </thead>
            <tbody>
              ${vehicleDetails
                .map(
                  (detail) => `
                <tr>
                  <td>${detail.vehicleName}</td>
                  <td>${detail.vehicleNumber}</td>
                  <td>${detail.driverName}</td>
                  <td>${detail.dieselReceived}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Total Fuel Issued</td>
                <td>${totalDieselReceived} L</td>
              </tr>
              <tr>
                <td colspan="3">Closing Balance</td>
                <td class="red-text">${closingBalance} L</td>
              </tr>
            </tfoot>
          </table>
        </div>
          
        <div class="container">
          <div class="footer">
            Report generated on ${new Date().toLocaleDateString("en-GB")}
          </div>
        </div>
        </body>
      </html>
    `;
    await page.setContent(htmlContent);

    // Generate the PDF as a buffer instead of saving it locally
    const pdfBuffer = await page.pdf({ format: "A4", landscape: true });
    await browser.close();

    // Define the file name and S3 bucket details
    const fileName = `${projectName}_diesel_report_${projectId}_${date}.pdf`;
    const bucketName = process.env.S3_BUCKET_NAME;

    // Upload the PDF buffer to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the S3 file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Send the file URL in the response
    res.status(200).json({
      message: "PDF generated successfully",
      downloadUrl: fileUrl, // Return the S3 file URL
    });
  } catch (error) {
    console.error("Error generating diesel report:", error);
    res.status(500).json({ message: "Failed to generate diesel report" });
  }
};

exports.generateDieselReportForRange = async (req, res) => {
  const { projectId, fromDate, toDate } = req.query;

  try {
    // Fetch the project details (including name)
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const projectname = project.name;
    const projectName = project.name.replace(/\s+/g, "_").toLowerCase();

    // Convert dates
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999); // Include the entire day

    // Fetch Diesel Attendance and Diesel Stock for the date range
    const dieselAttendance = await DieselAttendance.find({
      projectId,
      date: { $gte: start, $lte: end },
    }).populate("vehicleId");

    const dieselStock = await DieselStock.find({
      projectId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    // Find all unique vehicles in this range and fetch driver info
    const vehicleIds = dieselAttendance.map((entry) => entry.vehicleId._id);
    const uniqueVehicles = await Vehicle.find({
      _id: { $in: vehicleIds },
    });

    // Fetch drivers for these vehicles
    const drivers = await Driver.find({
      vehicles: { $in: vehicleIds },
    });

    // Create a map of drivers based on their vehicle assignments
    const driverMap = {};
    drivers.forEach((driver) => {
      driver.vehicles.forEach((vehicleId) => {
        driverMap[vehicleId] = driver.name; // Map driver names to vehicle IDs
      });
    });

    // Prepare a map of diesel attendance by date and vehicle
    const attendanceByDate = {};
    dieselAttendance.forEach((entry) => {
      const dateKey = entry.date.toISOString().split("T")[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {};
      }
      const vehicle = entry.vehicleId.name;
      if (!attendanceByDate[dateKey][vehicle]) {
        attendanceByDate[dateKey][vehicle] = 0;
      }
      attendanceByDate[dateKey][vehicle] += entry.totalReceived;
    });

    // Prepare an array of dates for the report range
    const dates = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(new Date(currentDate).toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1); // Move to next day
    }

    // Create report rows for each date
    let previousDayBalance = 0; // Initial balance
    const reportRows = dates.map((dateKey) => {
      const stock =
        dieselStock.find(
          (s) => s.date.toISOString().split("T")[0] === dateKey
        ) || {};
      const vehicles = attendanceByDate[dateKey] || {};
      const fuelConsumed = Object.values(vehicles).reduce(
        (sum, val) => sum + val,
        0
      );

      // Set opening and closing balance
      const openingBalance = stock.openingBalance || previousDayBalance;
      const closingBalance =
        stock.closingBalance || openingBalance - fuelConsumed;

      previousDayBalance = closingBalance;

      // Format the date as "dd/mm/yyyy"
      const formattedDate = new Date(dateKey).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // Return the data for this row
      return {
        date: formattedDate,
        openingBalance,
        lastFuelAdded: stock.totalFuelAdded || "",
        vehicles: uniqueVehicles.reduce((acc, vehicle) => {
          acc[vehicle.name] = vehicles[vehicle.name] || 0;
          return acc;
        }, {}),
        fuelConsumed,
        totalBalance: closingBalance,
      };
    });

    // Puppeteer code to generate PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    const formattedFromDate = new Date(fromDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedToDate = new Date(toDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 15px;
              color: black; 
            }
              .company-name {
              font-size: 25px;
              text-align: center;
              margin-bottom: 7px;
              text-transform: uppercase;
              font-weight: bold; 
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg); 
              font-size: 80px;
              color: rgba(0, 0, 0, 0.05);
              white-space: nowrap;
              z-index: 9999;
              pointer-events: none;
              user-select: none;
              width: 100%;
              text-align: center;
            }
            .footer {
              margin-top: 10px;
              text-align: right;
              font-size: 8px;
              color: #393e46;
            }
            .dark-red { color: #8B0000; }
            .header-row1 {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
              font-size: 12px;
            }
            .header-row1 div {
              margin-right: 12px;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
              color: #222831;
              font-size: 12px;
            }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { padding: 8px; border: 1px solid #ccc; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .vehicle-header {
              font-weight: bold;
              text-align: left;
              font-size: 12px;
            }
            .vehicle-number {
              font-weight: normal;
              font-size: 8px;
              color: #555;
            }
            .driver-name {
              color: green;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
         <div class="watermark">Engineer Constructions Private Limited</div>
        <div class="company-name">Engineer Constructions Private Limited</div>
        <h1>Monthly Diesel Report of <span class="dark-red">${projectname}</span></h1>
        <div class="header-row1">
            <div><strong>From:</strong> 
              ${formattedFromDate}</span>
            </div>
          </div>
          <div class="header-row">
            <div><strong>To:</strong> ${formattedToDate}</div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fuel Received (L)</th>
                <th>Opening Balance (L)</th> <!-- New Opening Balance Column -->
                ${uniqueVehicles
                  .map(
                    (vehicle) => `
                    <th>
                      <div class="vehicle-header">
                        ${vehicle.name}<br>
                        <span class="vehicle-number">${
                          vehicle.number
                        }</span><br>
                        <span class="driver-name">${
                          driverMap[vehicle._id] || ""
                        }</span>
                      </div>
                    </th>`
                  )
                  .join("")}
                <th>Total Fuel Consumed (L)</th>
                <th>Closing Balance (L)</th> <!-- Closing Balance -->
              </tr>
            </thead>
            <tbody>
              ${reportRows
                .map(
                  (row) => `
                <tr>
                  <td>${row.date}</td>
                  <td>${row.lastFuelAdded}</td>
                  <td><span class="dark-red">${row.openingBalance}</span></td> 
                  ${Object.values(row.vehicles)
                    .map((fuelReceived) => `<td>${fuelReceived}</td>`)
                    .join("")}
                  <td>${row.fuelConsumed}</td>
                  <td><span class="dark-red">${row.totalBalance}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="container">
          <div class="footer">
            Report generated on ${new Date().toLocaleDateString("en-GB")}
          </div>
        </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Generate the PDF as a buffer instead of saving it locally
    const pdfBuffer = await page.pdf({ format: "A4", landscape: true });
    await browser.close();

    // Define the file name and S3 bucket details
    const fileName = `diesel_report_${projectName}_${fromDate}_${toDate}.pdf`;
    const bucketName = process.env.S3_BUCKET_NAME;

    // Upload the PDF buffer to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the S3 file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Send the file URL in the response
    res.status(200).json({
      message: "PDF generated successfully",
      downloadUrl: fileUrl, // Return the S3 file URL
    });
  } catch (error) {
    console.error("Error generating diesel report:", error);
    res.status(500).json({ message: "Failed to generate diesel report" });
  }
};

exports.generateStockReportPDF = async (req, res) => {
  const { projectId, date } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectName = project.name.replace(/\s+/g, "_").toLowerCase();
    const selectedDate = new Date(date);

    // Fetch Products for the project
    const products = await Product.find({ projectId });

    // Fetch material received on the selected date (for non-bulk products)
    const materialsReceived = await MaterialReceipt.find({
      projectId,
      receiptDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
    });

    // Fetch bulk material received on the selected date (for bulk products)
    const bulkMaterialsReceived = await BulkMaterialReceived.find({
      product: { $in: products.map((p) => p._id) }, // Fetch only bulk materials related to this project
      receivedDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
    });

    // Fetch material consumed on the selected date
    const materialsConsumed = await MaterialConsumed.find({
      usageDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
    });

    // Puppeteer code to generate PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
             .company-name {
              font-size: 25px;
              text-align: center;
              margin-bottom: 7px;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-weight: bold; 
            }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 15px;
              color: black; 
            }
            .watermark {
              position: fixed;
              bottom: 13%;
              left: 5%;
              transform: translate(-50%, 50%) rotate(-50deg);
              font-size: 60px;
              color: rgba(0, 0, 0, 0.1);
              white-space: nowrap;
              z-index: 9999;
              pointer-events: none;
              user-select: none;
              width: 0%;
              text-align: left;
            }
            .footer {
              margin-top: 10px;
              text-align: right;
              font-size: 8px;
              color: #393e46;
            }
              .dark-red { color: #8B0000; }
              .red-text { color: red; font-weight: bold; }
            .table { width: 90%; border-collapse: collapse; margin-bottom: 20px;  }
            .container { margin: 10 auto; max-width: 800px; padding: 20px; }
            .table th, .table td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
            .table th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
         <div class="watermark">Engineer Constructions Private Limited</div>
        <div class="company-name">Engineer Constructions Private Limited</div>
        <h1>Daily Stock Report of <span class="dark-red">${
          project.name
        }</span></h1>
        <h1>Date - ${new Date(date).toLocaleDateString()}</h1>
          
          <table class="table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Material Name</th>
                <th>Type</th>
                <th>Distribution Type</th>
                <th>Received</th>
                <th>Consumed</th>
                <th>Used By</th>
                <th>Remaining Quantity</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map((product, index) => {
                  const isBulk = product.isBulk ? "Bulk" : "In-Store";
                  const distributionType = product.isBulk
                    ? ""
                    : product.distributionType;

                  let receivedValue = "";
                  if (product.isBulk) {
                    const bulkReceived = bulkMaterialsReceived.find(
                      (bulk) =>
                        bulk.product.toString() === product._id.toString()
                    );
                    receivedValue = bulkReceived
                      ? bulkReceived.totalVolume
                      : "";
                  } else {
                    const materialReceived = materialsReceived.find(
                      (received) =>
                        received.materialName.toString() ===
                        product._id.toString()
                    );
                    receivedValue = materialReceived
                      ? materialReceived.quantityReceived
                      : "";
                  }

                  const materialConsumed = materialsConsumed.find(
                    (consumed) =>
                      consumed.materialId.toString() === product._id.toString()
                  );
                  const consumedValue = materialConsumed
                    ? materialConsumed.quantityUsed
                    : "";
                  const usedByValue = materialConsumed
                    ? materialConsumed.usedBy
                    : "";
                  const remainingQuantity = product.availableQuantity;

                  return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${product.name}</td>
                    <td>${isBulk}</td>
                    <td>${distributionType}</td>
                    <td>${receivedValue || ""}</td>
                    <td>${consumedValue || ""}</td>
                    <td>${usedByValue || ""}</td>
                    <td>${remainingQuantity}</td>
                    <td>${product.unit}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            Report generated on ${new Date().toLocaleDateString("en-GB")}
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Generate the PDF as a buffer instead of saving it locally
    const pdfBuffer = await page.pdf({ format: "A4", landscape: true });
    await browser.close();

    // Define the file name and S3 bucket details
    const fileName = `${projectName}_stock_report_${date}.pdf`;
    const bucketName = process.env.S3_BUCKET_NAME;

    // Upload the PDF buffer to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the S3 file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Send the file URL in the response
    res.status(200).json({
      message: "PDF generated successfully",
      downloadUrl: fileUrl, // Return the S3 file URL
    });
  } catch (error) {
    console.error("Error generating diesel report:", error);
    res.status(500).json({ message: "Failed to generate diesel report" });
  }
};

exports.generateStockRangeReportPDF = async (req, res) => {
  const { projectId, productId, fromDate, toDate } = req.query;

  try {
    // Retry wrapper for queries to handle timeouts
    const retryQuery = async (queryFunction, retries = 3, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const result = await queryFunction();
          return result;
        } catch (error) {
          console.error(`Query attempt ${i + 1} failed. Retrying...`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw new Error("Max retries reached for query");
    };

    // Fetch the project and product details
    const project = await retryQuery(() => Project.findById(projectId));
    if (!project) return res.status(404).json({ message: "Project not found" });

    const projectName = project.name.replace(/\s+/g, "_").toLowerCase();

    const product = await retryQuery(() => Product.findById(productId));
    if (!product) return res.status(404).json({ message: "Product not found" });

    const selectedFromDate = new Date(fromDate);
    const selectedToDate = new Date(toDate);

    // Set the end of the selectedToDate to include the full day
    selectedToDate.setHours(23, 59, 59, 999);

    let materialsReceived = [];
    let bulkMaterialsReceived = [];
    let materialsConsumed = [];

    // Fetch materials depending on whether the product is bulk or in-store
    if (product.isBulk) {
      bulkMaterialsReceived = await retryQuery(() =>
        BulkMaterialReceived.find({
          product: product._id,
          receivedDate: {
            $gte: new Date(selectedFromDate.setHours(0, 0, 0, 0)),
            $lte: new Date(selectedToDate),
          },
        })
      );
    } else {
      if (product.distributionType === "direct container") {
        materialsReceived = await retryQuery(() =>
          MaterialReceipt.find({
            materialName: product._id,
            receiptDate: {
              $gte: new Date(selectedFromDate.setHours(0, 0, 0, 0)),
              $lte: new Date(selectedToDate),
            },
          })
        );
      } else if (product.distributionType === "split distribution") {
        materialsReceived = await retryQuery(() =>
          MaterialReceipt.find({
            materialName: product._id,
            receiptDate: {
              $gte: new Date(selectedFromDate.setHours(0, 0, 0, 0)),
              $lte: new Date(selectedToDate),
            },
          })
        );
      }

      materialsConsumed = await retryQuery(() =>
        MaterialConsumed.find({
          materialId: product._id,
          usageDate: {
            $gte: new Date(selectedFromDate.setHours(0, 0, 0, 0)),
            $lte: new Date(selectedToDate),
          },
        })
      );
    }

    // Determine product type and distribution type
    const productType = product.isBulk ? "Bulk" : "In-Store";
    const distributionType = product.isBulk
      ? ""
      : product.distributionType === "split distribution"
      ? "Split Distribution"
      : "Direct Container";

    // Puppeteer code to generate PDF
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Conditionally render different headers and rows based on whether the product is bulk
    const tableHeaders = product.isBulk
      ? `
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Date</th>
              <th>Received</th>
              <th>Units</th>
            </tr>
          </thead>
        `
      : `
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Date</th>
              <th>Received</th>
              <th>Consumed</th>
              <th>Used By</th>
              <th>Remaining Quantity</th>
              <th>Units</th>
            </tr>
          </thead>
        `;

    const tableRows = product.isBulk
      ? bulkMaterialsReceived
          .map((received, index) => {
            return `
              <tr>
                <td>${index + 1}</td>
                <td>${new Date(received.receivedDate).toLocaleDateString()}</td>
                <td>${received.totalVolume}</td>
                <td>${product.unit}</td>
              </tr>
            `;
          })
          .join("")
      : materialsReceived
          .map((received, index) => {
            // Compare dates without time
            const materialConsumed = materialsConsumed.find(
              (consumed) =>
                new Date(consumed.usageDate).setHours(0, 0, 0, 0) ===
                new Date(received.receiptDate).setHours(0, 0, 0, 0)
            );

            const consumedValue = materialConsumed
              ? materialConsumed.quantityUsed
              : "N/A";
            const usedByValue = materialConsumed
              ? materialConsumed.usedBy
              : "N/A";
            const remainingQuantity = materialConsumed
              ? materialConsumed.remainingQuantity
              : product.availableQuantity; // If material consumed, use remainingQuantity from MaterialConsumed schema
            const receivedValue =
              product.distributionType === "direct container"
                ? received.quantityReceived
                : received.totalUnits;

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${new Date(received.receiptDate).toLocaleDateString()}</td>
                <td>${receivedValue}</td>
                <td>${consumedValue}</td>
                <td>${usedByValue}</td>
                <td>${remainingQuantity}</td>
                <td>${product.unit}</td>
              </tr>
            `;
          })
          .join("");

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .company-name {
              font-size: 25px;
              text-align: center;
              margin-bottom: 7px;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-weight: bold; 
            }
                  .header-row1 {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                font-size: 12px;
              }
              .header-row1 div {
                margin-right: 12px;
              }
                .header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                color: #222831;
                font-size: 12px;
              }
                 .container {
                width: 90%;
                margin: 0 auto;
              }
            h1 {
              text-align: center;
              font-size: 20px;
              margin-bottom: 50px;
              color: black; 
            }
            .watermark {
              position: fixed;
              bottom: 13%;
              left: 5%;
              transform: translate(-50%, 50%) rotate(-50deg);
              font-size: 60px;
              color: rgba(0, 0, 0, 0.1);
              white-space: nowrap;
              z-index: 9999;
              pointer-events: none;
              user-select: none;
              width: 0%;
              text-align: left;
            }
            .footer {
              margin-top: 10px;
              text-align: right;
              font-size: 8px;
              color: #393e46;
            }
              .dark-red { color: #8B0000; }
              .red-text { color: red; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
            .table th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>

         <div class="watermark">Engineer Constructions Private Limited</div>
        <div class="company-name">Engineer Constructions Private Limited</div>
        <h1>Monthly Stock Report of <span class="dark-red">${
          project.name
        }</span></h1>

<div class="container">
         <div class="header-row1">
                <div><strong>Material Name:</strong> ${product.name}</div>
                <div><strong>Date:</strong> ${new Date(
                  fromDate
                ).toLocaleDateString()} - ${new Date(
      toDate
    ).toLocaleDateString()}</div>
              </div>
              <div class="header-row">
                <div><strong>Type: </strong>${productType}</div>
                <div>${
                  productType === "In-Store"
                    ? ` <strong>Distribution Type: </strong>${distributionType}`
                    : ""
                }</div>
              </div>
         </div>
<div class="container">
        <table class="table">
          ${tableHeaders}
          <tbody>
            ${tableRows}
          </tbody>
        </table>
       </div>
          <div class="container">
        <div class="footer">
          Report generated on ${new Date().toLocaleDateString("en-GB")}
        </div>
        </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    const sanitizedFromDate = fromDate.replace(/:/g, "-");
    const sanitizedToDate = toDate.replace(/:/g, "-");

    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const bucketName = process.env.S3_BUCKET_NAME;
    const fileName = `${projectName}_stock_report_${sanitizedFromDate}_to_${sanitizedToDate}.pdf`;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate the file URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    res.status(200).json({
      message: "PDF generated successfully",
      downloadUrl: fileUrl,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};
