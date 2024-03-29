// Other files
const ConfigurationFile = require("./General/ConfigurationFile.json");
const Buttons = require("./General/Buttons.json");
const GridFormButtons = require("./General/GridFormButtons.json");
const TableFormButtons = require("./General/TableFormButtons.json");
const dashboardRoutes = require("./General/dashboardRoutes.json");
const formsToInsert = require("./ImportForms.js");

// Libraries
var amqp = require("amqplib/callback_api");
var request = require("request-promise");
var WebSocketServer = new require("ws");
const fs = require("fs");
var path = require("path");

// RESTS LOCAL
const CamundaApiHost = "http://192.168.2.19:8080/engine-rest"; // Camunda REST //статический адрес
const metaRESTApi = "http://192.168.2.150:5656"; // Depo main REST/нах-ся - meta data
const asistRESTApi = "http://192.168.2.150"; // ASIST main REST
const keycloakRESTApi = "http://192.168.2.160:8080"; // Keycloak REST
const jasperRESTApi = "http://192.168.2.150:8080"; // Jasper REST
const keycloackRoleId = "dced7bea-8a93-4baf-964b-232e75a758c5";
const filesDirectory = "C:/ScannedFiles/"; // Contracts files directory
const enumDataApi = "/ASIST-MODERN-API/api/Enum/GetEnumItems?enumDefId=";

// RESTS SERVER - 54
// const CamundaApiHost = 'http://10.10.0.12:8080/engine-rest' // Camunda REST
// const metaRESTApi = "http://10.10.0.11:44327" // Depo main REST
//const asistRESTApi = "http://192.168.2.150:80" // Depo main REST tdj=150=54
// const keycloakRESTApi = "http://10.10.0.12:8180" // Keycloak REST
// const jasperRESTApi = "http://10.10.0.11:8080" // Jasper REST
// const keycloackRoleId = "d44359e4-82ff-4823-b478-6e6486fabaa5"
// const filesDirectory = "/home/depo/Documents/depo/ScannedFiles/" // Contracts files directory

// List of connected clients
var clients = {};
// Create random client id
function getUUID() {
  let uuidv1 = require("uuid/v1");
  return uuidv1();
}
// Launch camunda process with incoming vars
function startCamundaProcess(session_id, process_id, processKey, variables) {
  console.log("START PROCESS VARS", variables);
  variables["CamundaApiHost"] = { value: CamundaApiHost };
  variables["keycloakRESTApi"] = { value: keycloakRESTApi };
  variables["metaRESTApi"] = { value: metaRESTApi };
  variables["asistRESTApi"] = { value: asistRESTApi };
  variables["jasperRESTApi"] = { value: jasperRESTApi };

  request.post(
    {
      headers: { "content-type": "application/json" },
      url: CamundaApiHost + "/process-definition/key/" + processKey + "/start",
      body: JSON.stringify({ variables: variables }),
    },
    (error, response, body) => {
      if (error) {
        return console.log("call REST error: ", error);
      } else {
        clients[session_id].send(
          JSON.stringify({
            messageType: "processInfo",
            data: body,
            process_id: process_id,
          })
        );
        // console.log('START PROCESS', response)
      }
    }
  );
}
// Complete camunda task by taskID
async function completeTask(variables, taskID) {
  // console.log("Variables", variables)
  request.post(
    {
      headers: { "content-type": "application/json" },
      url: CamundaApiHost + "/task/" + taskID + "/complete",
      body: JSON.stringify({ variables: variables }),
    },
    async (error, response, body) => {
      if (error) {
        return console.log("complete task error: ", error);
      }
    }
  );
}
//Воостановления сессии
async function restoreSession(userId, session_id, userRole) {
  var camundaTaskList = await getCamundaTaskList();
  for (let i = 0; i < camundaTaskList.length; i++) {
    var task = null;
    let message;
    task = await getTaskVariables(camundaTaskList[i].id);
    // console.log("TASK", task)
    try {
      var taskType = task.taskType.value;
      if (task.userId.value === userId) {
        if (
          taskType === "showPersonSearchForm" ||
          taskType === "showPersonCreatForm" ||
          taskType === "showPersonFilterForm" ||
          taskType === "showPersonOpenForm" ||
          taskType === "showPersonSaveForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendPersonForm(message, camundaTaskList[i].id, true);
        }
        else if (
          taskType === "showApplicationForm" ||
          taskType === "showAppStateForm" ||
          taskType === "showAppStateSaveForm" ||
          taskType === "showAppStateViewForm" ||
          taskType === "showFamMemberCreateForm" ||
          taskType === "showLandPlotCreateForm" ||
          taskType === "showIncomeCreateForm" ||
          taskType === "showTrusteePersonForm"

        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendAppStateForm(message, camundaTaskList[i].id, true);
        }
        else if (taskType === "showApplicationsGridForm") {
          message = JSON.parse(task.taskVariables.value);
          await sendApplicationsGridForm(message, camundaTaskList[i].id, true);
        }
        else if (
          taskType === "showSearchUser" ||
          taskType === "showCreateUser" ||
          taskType === "showEditUser"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendUserForm(session_id, message, true);
        }
        else if (
          taskType === "showCloseMonthCreateParamForm" ||
          taskType === "showCloseMonthSearchParamForm" ||
          taskType === "showCloseMonthOnlyReadForm" ||
          taskType === "showCloseMonthGetListGridForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendCloseMonthForm(message, camundaTaskList[i].id, true);
        }
        else if (
          taskType === "showOpenBanckAccountGetListForm" ||
          taskType === "showOpenBankDistrRegisterForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendOpenBankAccountGetListForm(
            message,
            camundaTaskList[i].id,
            true
          );
        }
        else if (
          taskType === "showOpenBankAccountPreviewGridForm" ||
          taskType === "showOpenBankAccountRegisterForm" ||
          taskType === "showOpenBankAccDistrAppForms"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendCreateOpenBankAccountRegisterForm(
            message,
            camundaTaskList[i].id,
            true
          );
        }
        else if (
          taskType === "showUploadGetListGridForm" ||
          taskType === "showUploadDistrDetailGridForm" ||
          taskType === "showUploadBankAccountFileForm" ||
          taskType === "showUploadBankAccountSendFileForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendUploadGetListForm(message, camundaTaskList[i].id, true);
        }
        else if (
          taskType === "showRegistersForPaymentGetListForm" ||
          taskType === "showRegistersForPaymentDistrForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendRegistersForPaymentGetListForm(
            message,
            camundaTaskList[i].id,
            true
          );
        }
        else if (taskType === "showRegistersForPaymentDistrForm1") {
          message = JSON.parse(task.taskVariables.value);
          await sendRegistersForPayment2GridForm(
            message,
            camundaTaskList[i].id,
            true
          );
        }
        else if (
          taskType === "showRegForPayCreatDetailForm" ||
          taskType === "showPreviewRegForPayDocListForm" ||
          taskType === "showRegForPayAssignDetailForm" ||
          taskType === "showRegForPayCreatDistrForm"
        ) {
          message = JSON.parse(task.taskVariables.value);
          await sendCreateRegForPaymentForm(
            message,
            camundaTaskList[i].id,
            true
          );
        }
        else {
          if (taskType === "showToast") {
            let vars = { userAction: { value: "cancel" } };
            await completeTask(vars, camundaTaskList[i].id);
          }
        }
      }
    } catch (er) {
      console.log("CLOSE", er);
      // let vars = {"userAction": {"value": "cancel"}}
      // await completeTask(vars, camundaTaskList[i].id)
    }
  }
}
// Get all camunda Tasks
async function getCamundaTaskList() {
  var camundaTaskList = await request({
    url: CamundaApiHost + "/task",
  })
    .then(function (response) {
      var data = JSON.parse(response);
      return data;
    })
    .catch(function (error) {
      return console.log("Getting Camunda Task List error: ", error);
    });
  return camundaTaskList;
}
// Get all task variables by id
async function getTaskVariables(id) {
  var taskVariables = await request({
    url: CamundaApiHost + "/task/" + id + "/variables",
  })
    .then(function (response) {
      var data = JSON.parse(response);
      // console.log("GET VARS", data)
      return data;
    })
    .catch(function (error) {
      return console.log("Getting Camunda Task Variables error: ", error);
    });
  return taskVariables;
}
// Get Json data in serialized type
async function getObjectTypeData(id, varName) {
  // console.log("GET OBJECT", varName)
  var objectTypeData = await request({
    url:
      CamundaApiHost +
      "/task/" +
      id +
      "/variables/" +
      varName +
      "?deserializeValue=false",
  })
    .then(function (response) {
      var data = JSON.parse(response);
      return data;
    })
    .catch(function (error) {
      return console.log("Getting Camunda docList error: ", error);
    });
  return objectTypeData;
}
async function getEnumData(Form) {
  // console.log("Form", Form.formName);
  var enumData = [];
  for (var section1 = 0; section1 < Form.sections.length; section1++) {
    // 1 Level
    if (Form.sections[section1].type !== "Doc" && Form.sections[section1].type !== "DocList") {
      // console.log("TYPE", Form.sections[section1].type)
      for (var content1 = 0; content1 < Form.sections[section1].contents.length; content1++) {
        if (Form.sections[section1].contents[content1].type === "Enum") {
          let enumName = Form.sections[section1].contents[content1].name;
          let enumDef = Form.sections[section1].contents[content1].enumDef;
          let apiName = enumDataApi + enumDef;
          let newEnumList = await getEnumValues(apiName, enumName, enumDef);
          enumData.push(newEnumList);
        }
      }
    }
    // 2nd Level
    else if (Form.sections[section1].type === "Doc" || Form.sections[section1].type === "DocList") {
      for (var section2 = 0; section2 < Form.sections[section1].sections.length; section2++) {
        if (Form.sections[section1].sections[section2].type !== "Doc" && Form.sections[section1].sections[section2].type !== "DocList") {
          for (var content2 = 0; content2 < Form.sections[section1].sections[section2].contents.length; content2++) {
            if (Form.sections[section1].sections[section2].contents[content2].type === "Enum") {
              let enumName = Form.sections[section1].sections[section2].contents[content2].name;
              let enumDef = Form.sections[section1].sections[section2].contents[content2].enumDef;
              let apiName = enumDataApi + enumDef;
              let newEnumList = await getEnumValues(apiName, enumName, enumDef);
              enumData.push(newEnumList);
            }
          }
        }
        // 3rd Level
        else if (Form.sections[section1].sections[section2].type === "Doc" || Form.sections[section1].sections[section2].type === "DocList") {
          // console.log("DOC EN 2 LV", Form.sections[section1].sections[section2].name, Form.sections[section1].sections[section2].type)
          for (var section3 = 0; section3 < Form.sections[section1].sections[section2].sections.length; section3++) {
            for (var content3 = 0; content3 < Form.sections[section1].sections[section2].sections[section3].contents.length; content3++) {
              if (Form.sections[section1].sections[section2].sections[section3].contents[content3].type === "Enum") {
                // console.log("DOC EN 3 LV", Form.sections[section1].sections[section2].sections[section3].contents[content3].name)
                let enumName = Form.sections[section1].sections[section2].sections[section3].contents[content3].name;
                let enumDef = Form.sections[section1].sections[section2].sections[section3].contents[content3].enumDef;
                let apiName = enumDataApi + enumDef;
                let newEnumList = await getEnumValues(apiName, enumName, enumDef);
                enumData.push(newEnumList);
              }
            }
          }
        }
      }
    }
  }
  // console.log("APINAME", apiName);
  // console.log("Enums", enumData)
  return enumData;
}
// Request Enum Data from API
async function getEnumValues(apiName, enumName, enumDef) {
  // console.log("ENUM ITEM", enumName);
  var newEnumValues = await request({
    headers: { "content-type": "application/json" },
    url: asistRESTApi + apiName,
  })
    .then(function (response) {
      let resp = JSON.parse(response);
      let parsedData = resp;
      // console.log("ПРИМЕР ОТВЕТА JSON ОБЪЕКТА", response, resp);
      let newEnumData = [];
      let dataToCollect = ConfigurationFile.enumConfig[enumDef].data;
      for (let key = 0; key < parsedData.length; key++) {
        let newItem = {};
        for (let item in dataToCollect) {
          if (item === "id") {
            newItem[item] =
              parsedData[key][ConfigurationFile.enumConfig[enumDef].data[item]];
          } else {
            let fullLetter = null;
            for (
              let n = 0;
              n < ConfigurationFile.enumConfig[enumDef].data[item].length;
              n++
            ) {
              let itemToAppend =
                ConfigurationFile.enumConfig[enumDef].data[item][n];
              if (itemToAppend === "-" || itemToAppend === " ") {
                fullLetter += itemToAppend;
              } else {
                let newLetter = parsedData[key][itemToAppend];
                // console.log("NEW LETTER", newLetter)
                if (fullLetter === null) {
                  fullLetter = newLetter;
                } else {
                  fullLetter = fullLetter + parsedData[key][itemToAppend];
                }
              }
            }
            newItem[item] = fullLetter;
          }
        }
        newEnumData.push(newItem);
      }
      var data = {
        name: enumName,
        data: newEnumData,
      };
      // console.log("ENUM DATA: ", data)
      return data;
    })
    .catch(function (error) {
      return console.log("Collecting enum data error: ", error);
    });
  // console.log("newEnumValues", newEnumValues)
  return newEnumValues;
}
async function getSubDocuments(selectedDoc, form, userId) {
  let subDocuments = {};
  let selDoc = JSON.parse(selectedDoc);
  for (let i = 0; i < selDoc.attributes.length; i++) {
    if (selDoc.attributes[i].type === "Doc") {
      if (selDoc.attributes[i].value !== null) {
        if (selDoc.attributes[i].value !== null && (selDoc.attributes[i].subDocument === null || selDoc.attributes[i].subDocument === undefined)) {
          console.log("SUB DOC", selDoc.attributes[i].name)
          // if (selDoc.attributes[i].subDocument === null || selDoc.attributes[i].subDocument === undefined) {
          for (let s = 0; s < form.sections.length; s++) {
            if (form.sections[s].type === "Doc" && selDoc.attributes[i].name === form.sections[s].name) {
              await request({
                headers: { "content-type": "application/json" },
                url: asistRESTApi + "/ASIST-MODERN-API/api/Document/GetDocumentById/" + selDoc.attributes[i].value + "?userId=" + userId,
                json: true,
                method: "GET",
              })
                .then(async function (response) {
                  console.log("RES: ", selDoc.attributes[i].name);
                  subDocuments[selDoc.attributes[i].name] = response;
                })
                .catch(function (error) { });
            }
          }
          // }

        }
        else if (typeof selDoc.attributes[i].subDocument === "object") {
          subDocuments[selDoc.attributes[i].name] = selDoc.attributes[i].subDocument
        }
      }
      else {
        subDocuments[selDoc.attributes[i].name] = { id: null, attributes: [] }
      }
    }
  }
  return subDocuments;
}
async function getSubDocList(selectedDoc, form, userId, userRole) {
  // console.log("SDOC", selectedDoc)
  let subDocList = {};
  let selDoc = JSON.parse(selectedDoc);

  for (let s1 = 0; s1 < form.sections.length; s1++) {
    if (form.sections[s1].type === "DocList") { // 1 Level
      let name = form.sections[s1].name
      let api = form.sections[s1].docListDef.api
      let url = ConfigurationFile.enumConfig[api] + selDoc.id + "&userId=" + userId
      let gButtons = GridFormButtons[ConfigurationFile.rolesConfig[userRole]][form.sections[s1].buttons]
      let listItem = await fetchSubDocList(url, gButtons)
      subDocList[name] = listItem
    }
    else if (form.sections[s1].type === "Doc") { // 2 Level
      let name = form.sections[s1].name
      let docId = await get2LevelDocId(selDoc, name)
      console.log("DOC ID", docId)
      for (let s2 = 0; s2 < form.sections[s1].sections.length; s2++) {
        if (form.sections[s1].sections[s2].type === "DocList") {
          let api = ConfigurationFile.enumConfig[form.sections[s1].sections[s2].docListDef].api
          let url = api + docId + "&userId=" + userId
          let gButtons = GridFormButtons[ConfigurationFile.rolesConfig[userRole]][form.sections[s1].sections[s2].buttons]
          let listItem = await fetchSubDocList(url, gButtons)
          console.log("URL", name, form.sections[s1].sections[s2].name, url, listItem)
          subDocList[form.sections[s1].sections[s2].name] = listItem
        }
        // else if (form.sections[s1].sections[s2].type === "Doc") {
        //   // console.log("DOC3", form.sections[s1].sections[s2].name)
        //   for (let s3 = 0; s3 < form.sections[s1].sections[s2].sections.length; s3++) {
        //     if (form.sections[s1].sections[s2].sections[s3].type === "DocList") {
        //       let name = form.sections[s1].sections[s2].sections[s3].name
        //       let docId = await get3LevelDocId(selDoc, name)
        //       let api = ConfigurationFile.enumConfig[form.sections[s1].sections[s2].sections[s3].docListDef].api
        //       let url = api + docId + "&userId=" + userId
        //       // console.log("API", url)
        //       let gButtons = GridFormButtons[ConfigurationFile.rolesConfig[userRole]][form.sections[s1].sections[s2].sections[s3].buttons]
        //       let listItem = await fetchSubDocList(url, gButtons)
        //       subDocList[name] = listItem
        //     }
        //   }
        // }
      }
    }
  }
  return subDocList;
}
async function get2LevelDocId(doc, name) {
  for (let i1 = 0; i1 < doc.attributes.length; i1++) {
    if (doc.attributes[i1].type === "Doc" && doc.attributes[i1].name === name) {
      // console.log("ATTR", doc.attributes[i1].name, doc.attributes[i1].type, doc.attributes[i1].value)
      return doc.attributes[i1].value
    }
  }
}
// async function get3LevelDocId(doc, name) {
//   for (let i1 = 0; i1 < doc.attributes.length; i1++) {
//     if (doc.attributes[i1].type === "Doc") {
//       for (let i2 = 0; i2 < doc.attributes[i1].subDocument.attributes.length; i2++) {
//         if (doc.attributes[i1].subDocument.attributes[i2].type === "DocList" && doc.attributes[i1].subDocument.attributes[i2].type === name) {
//           return doc.attributes[i1].subDocument.attributes[i2].id
//         }
//       }
//     }
//   }
// }
async function fetchSubDocList(url, buttons) {
  // console.log("URL", url)
  let resp = {}
  await request({
    headers: { "content-type": "application/json" },
    url: asistRESTApi + url,
    json: true,
    method: "GET",
  })
    .then(async function (response) {
      response.buttons = buttons;
      resp = response;
      // console.log("RES SUBDOCL: ", response);
    })
    .catch(function (error) {
      let er = { totalCount: 0, documents: [] }
      er.buttons = buttons;
      resp = er;
      // console.log("RES SUBDOCL ERR: ", er.buttons);
    });
  return resp
}
//***System main tasks functions***
async function sendInstructionsForm(session_id, message, restore) {
  let gridForm = null;
  let gridFormButtons = null;
  let gridFormEnumData = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    gridFormEnumData = await getEnumData(gridForm);
  }
  let Form = JSON.parse(JSON.parse(message.form));
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(Form);
  let instructionAccountRelations = await getEnumValues("/api/InstructionAccountRelations/Gets", "instructionAccountRelations", "088ae9de-e330-44f7-977e-66b8e5f88e46");
  enumData.push(instructionAccountRelations);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    gridFormEnumData: gridFormEnumData,
    Form: Form,
    gridForm: gridForm,
    buttons: buttons,
    gridFormButtons: gridFormButtons,
    selectedDoc: message.selectedDoc,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    taskID: message.taskID,
    docId: message.docId,
    session_id: session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
  };
  console.log("Sending Instructions Form");
  await sendMessage(mes);
}
// Collect data related to UserForm form and send to client
async function sendUserForm(session_id, message, restore) {
  let userForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let gridFormEnumData = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    gridFormEnumData = await getEnumData(gridForm);
  }
  // console.log("FORM", userForm)
  buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(userForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    gridFormEnumData: gridFormEnumData,
    Form: userForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    taskID: message.taskID,
    docId: message.docId,
    session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  // console.log("Sending User Form");
  await sendMessage(mes);
}
// Collect data related to PersonForm form and send to client
async function sendPersonForm(message, taskID, restore) {
  console.log("MESS", message);
  // let form = eval(message.form)
  let personForm = null;
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  let gridFormEnumData = null;
  let enumData = null;
  let buttons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    gridFormEnumData = await getEnumData(gridForm);
  }
  if (message.form !== "null") {
    personForm = JSON.parse(JSON.parse(message.form));
    buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
    enumData = await getEnumData(personForm);
  }

  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    gridFormEnumData: gridFormEnumData,
    Form: personForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    tableFormButtons: tableFormButtons,
    buttons: buttons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending User Form", mes);
  await sendMessage(mes);
}
// Collect data related to PersonForm form and send to client
async function sendAppStateForm(message, taskID, restore) {
  // console.log("MESS sendAppStateForm", message);
  let subDocuments = null;
  let subDocList = null;
  let appStateForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  let gridFormEnumData = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    gridFormEnumData = await getEnumData(gridForm);
  }
  if (message.selectedDoc !== "null") {
    subDocuments = await getSubDocuments(message.selectedDoc, appStateForm, message.userId);
    // if (message.taskType === "showAppStateForm") {
    //   subDocuments.Application = JSON.parse(message.application);
    // }
    // subDocList = {"Family_Member": [{id: "9848948589", attributes: [{name: "IIN", value: "5651651", type: "Text"}]}]}
    subDocList = await getSubDocList(message.selectedDoc, appStateForm, message.userId, message.userRole);
    gridFormEnumData = await getEnumData(appStateForm);
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];

  var enumData = await getEnumData(appStateForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    gridFormEnumData: gridFormEnumData,
    Form: appStateForm,
    selectedDoc: message.selectedDoc,
    subDocuments: subDocuments,
    subDocList: subDocList,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    tableFormButtons: tableFormButtons,
    buttons: buttons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  // console.log("sendAppStateForm", mes);
  await sendMessage(mes);
}
//Список заявлений на АСП по статусу
async function sendApplicationsGridForm(message, taskID, restore) {
  console.log("MESS", message);
  let appsSearchForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(appsSearchForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: appsSearchForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
    stateTypeId: message.stateTypeId,
  };
  console.log("Sending uploadForms Form");
  await sendMessage(mes);
}
// Collect data related to CloseMonth form and send to client
async function sendCloseMonthForm(message, taskID, restore) {
  console.log("MESS", message);
  // let form = eval(message.form)
  let closeMonthForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    //tableFormButtons = JSON.parse(JSON.parse(message.tableFormButtons))
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  // console.log("FORM", userForm)
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(closeMonthForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }

  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: closeMonthForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending CloseMonth Form");
  await sendMessage(mes);
}
//openBankAccountGetListProcess
async function sendOpenBankAccountGetListForm(message, taskID, restore) {
  console.log("MESS", message);
  let openBankAccountForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  // console.log("FORM", userForm)
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(openBankAccountForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: openBankAccountForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending openBankAccount Form");
  await sendMessage(mes);
}
//CreatOpenBankAccountRegisterProcess
async function sendCreateOpenBankAccountRegisterForm(message, taskID, restore) {
  console.log("MESS", message);
  let openBankAccountForm = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  // console.log("FORM", userForm)
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(openBankAccountForm);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: openBankAccountForm,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending openBankAccount Form");
  await sendMessage(mes);
}
//UploadGetListProcess
async function sendUploadGetListForm(message, taskID, restore) {
  console.log("MESS", message);
  let uploadForms = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(uploadForms);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: uploadForms,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending uploadForms Form");
  await sendMessage(mes);
}
//Реестр на оплату
async function sendRegistersForPaymentGetListForm(message, taskID, restore) {
  console.log("MESS", message);
  let registersPayForms = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(registersPayForms);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: registersPayForms,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending uploadForms Form");
  await sendMessage(mes);
}
async function sendCreateRegForPaymentForm(message, taskID, restore) {
  console.log("MESS", message);
  let createRegPayForms = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  //var enumData = await getEnumData(createRegPayForms)
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    //enumData: enumData,
    Form: createRegPayForms,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    docList: message.docList,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending createRegPayForms Form");
  await sendMessage(mes);
}
//Реестр на оплату по районам и по № выплат
async function sendRegistersForPayment2GridForm(message, taskID, restore) {
  console.log("MESS", message);
  let registersPayForms = JSON.parse(JSON.parse(message.form));
  let gridForm = null;
  let gridForm2 = null;
  let gridFormButtons = null;
  let tableFormButtons = null;
  if (message.gridForm !== "null" && message.gridForm2 !== "null") {
    gridForm = JSON.parse(JSON.parse(message.gridForm));
    gridForm2 = JSON.parse(JSON.parse(message.gridForm2));
    gridFormButtons = GridFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.gridFormButtons];
    tableFormButtons = TableFormButtons[ConfigurationFile.rolesConfig[message.userRole]][message.tableFormButtons];
  }
  let buttons = Buttons[ConfigurationFile.rolesConfig[message.userRole]][message.buttons];
  var enumData = await getEnumData(registersPayForms);
  var messageType = "userTask";
  if (restore === true) {
    messageType = "restoreTab";
  }
  let mes = {
    userId: message.userId,
    messageType: messageType,
    taskType: message.taskType,
    enumData: enumData,
    Form: registersPayForms,
    selectedDoc: message.selectedDoc,
    gridForm: gridForm,
    gridForm2: gridForm2,
    docList: message.docList,
    docList2: message.docList2,
    size: message.size,
    page: message.page,
    formType: message.formType,
    gridFormButtons: gridFormButtons,
    buttons: buttons,
    tableFormButtons: tableFormButtons,
    taskID: taskID,
    docId: message.docId,
    session_id: message.session_id,
    process_id: message.process_id,
    tabLabel: message.tabLabel,
    totalCount: message.totalCount,
  };
  console.log("Sending uploadForms Form", mes);
  await sendMessage(mes);
}
//сохранения отсканированных файлов
async function saveContract(incomingJson) {
  completeTask(incomingJson.variables, incomingJson.taskID);
  // console.log("CONTR", incomingJson)
  let dirPath = filesDirectory + incomingJson.directory;
  var folderCreated = false;
  try {
    fs.mkdirSync(dirPath);
    folderCreated = true;
  } catch (e) {
    folderCreated = true;
    // console.log(e)
  }
  if (folderCreated === true) {
    var lastBlobSaved = false;
    for (let i = 0; i < incomingJson.blobs.length; i++) {
      var buf = new Buffer.alloc(
        incomingJson.blobs[i].size,
        incomingJson.blobs[i].blob,
        "base64"
      ); // decode
      fs.writeFile(
        filesDirectory +
        incomingJson.directory +
        "/" +
        incomingJson.blobs[i].name,
        buf,
        function (err) {
          console.log(incomingJson.blobs[i].name);
          if (err) {
            console.log("err", err);
          } else {
            console.log("success");
          }
        }
      );
      if (i === incomingJson.blobs.length) {
        lastBlobSaved = true;
      }
    }
    if ((lastBlobSaved = true)) {
      clients[incomingJson.session_id].send(
        JSON.stringify({
          messageType: "toast",
          toastText: "Файлы сохранены!",
          toastType: "success",
        })
      );
    }
  }
}
//удаления отсканированных файлов из директории
async function deleteSavedDoc(incomingJson) {
  let dirPath =
    filesDirectory + incomingJson.directory + "/" + incomingJson.fileName;
  try {
    fs.unlink(dirPath, function (err) {
      console.log("Successfully deleted");
      console.log("INC", incomingJson);
      for (var key in clients) {
        if (clients[key].userId === incomingJson.userId) {
          session_id = clients[key].session_id;
          clients[session_id].send(
            JSON.stringify({
              messageType: "toast",
              toastText: "Файл удален!",
              toastType: "success",
            })
          );
        }
      }
    });
  } catch (err) {
    console.log("Deleting error", err);
  }
}
// удаления отсканированных файлов из директории
async function downloadAccToExcel(incomingJson) {
  await request({
    headers: { "content-type": "application/json" },
    url:
      asistRESTApi +
      "/ASIST-MODERN-API/api/OpenBankAccount/DistrictRegistryToExcel?docId=" +
      incomingJson.docId,
    json: true,
    method: "GET",
  })
    .then(async function (response) {
      console.log("RES: ", incomingJson);
      let message = {
        userId: incomingJson.userId,
        messageType: "downloadBlob",
        blob: response,
      };
      sendMessage(message);
      // clients[incomingJson.session_id].send({messageType: "downloadBlob", blob: response})
    })
    .catch(function (error) {
      // ERROR
    });
}
// send message to user
async function sendMessage(message) {
  console.log("SEND MESSAGE", message.userId);
  for (let key in clients) {
    if (clients[key].userId === message.userId) {
      session_id = clients[key].session_id;
      await clients[session_id].send(JSON.stringify(message));
    }
  }
}
async function sendToast(message, taskID) {
  console.log("TOAST", message, taskID);
  for (var key in clients) {
    if (clients[key].userId === message.userId) {
      session_id = clients[key].session_id;
      await clients[session_id].send(
        JSON.stringify({
          messageType: "toast",
          toastText: message.toastText,
          toastType: message.toastType,
        })
      );
      let vars = {
        userAction: { value: "cancel" },
      };
      setTimeout(completeTask, 2000, vars, taskID);
    }
  }
}
// Find created user, complete task with new variables
async function setRoleToUser(session_id, message) {
  let parsedDocList = JSON.parse(message.docList);
  for (let i = 0; i < parsedDocList.length; i++) {
    console.log("ROLE", parsedDocList[i]["username"]);
    if (message.docId === parsedDocList[i]["username"]) {
      let vars = {
        createdUserId: { value: parsedDocList[i]["id"] },
        setRoleBody: {
          value: JSON.stringify([
            { id: keycloackRoleId, name: "userManagement" },
          ]),
        },
      };
      setTimeout(completeTask, 2000, vars, message.taskID);
    }
  }
}
// Create user menu from allowed list in user profile
async function generateMenu(userProfile) {
  console.log("GEN MENU", userProfile);
  let emptyLevels = [];
  // Crete emty levels to fit it later
  for (let i = 0; i < dashboardRoutes.level2.length; i++) {
    let newLevel = {
      name: dashboardRoutes.level2[i].name,
      label: dashboardRoutes.level2[i].label,
      state: dashboardRoutes.level2[i].state,
      launchProcess: dashboardRoutes.level2[i].launchProcess,
      commandType: dashboardRoutes.level2[i].commandType,
      processKey: dashboardRoutes.level2[i].processKey,
      parentLabel: dashboardRoutes.level2[i].parentLabel,
      level3: [],
    };
    emptyLevels.push(newLevel);
  }
  for (let i = 0; i < dashboardRoutes.level2.length; i++) {
    // Fit emty levels using user profile permissions
    for (let l = 0; l < dashboardRoutes.level2[i].level3.length; l++) {
      if (dashboardRoutes.level2[i].level3[l].level4 === null) {
        // Level 4 is empty
        if (userProfile[dashboardRoutes.level2[i].level3[l].name] === true) {
          // Define user access to menu items
          let newSectionItem = dashboardRoutes.level2[i].level3[l];
          for (let m = 0; m < emptyLevels.length; m++) {
            if (dashboardRoutes.level2[i].name === emptyLevels[m].name) {
              // Push menu item that user have access to
              emptyLevels[m].level3.push(newSectionItem);
            }
          }
        }
      } else {
        // Level 4 is NOT empty
        let newSectionItem = {
          name: dashboardRoutes.level2[i].level3[l].name,
          label: dashboardRoutes.level2[i].level3[l].label,
          state: dashboardRoutes.level2[i].level3[l].state,
          launchProcess: dashboardRoutes.level2[i].level3[l].launchProcess,
          commandType: dashboardRoutes.level2[i].level3[l].commandType,
          processKey: dashboardRoutes.level2[i].level3[l].processKey,
          parentLabel: dashboardRoutes.level2[i].level3[l].parentLabel,
          level4: [],
        };
        for (let m = 0; m < emptyLevels.length; m++) {
          if (dashboardRoutes.level2[i].name === emptyLevels[m].name) {
            // Push menu item that user have access to
            emptyLevels[m].level3.push(newSectionItem);
          }
        }
        for (
          let n = 0;
          n < dashboardRoutes.level2[i].level3[l].level4.length;
          n++
        ) {
          for (let m = 0; m < emptyLevels.length; m++) {
            for (let p = 0; p < emptyLevels[m].level3.length; p++) {
              if (newSectionItem.name === emptyLevels[m].level3[p].name) {
                // Push menu item that user have access to
                if (
                  userProfile[
                  dashboardRoutes.level2[i].level3[l].level4[n].name
                  ] === true
                ) {
                  // Define user access to menu items
                  emptyLevels[m].level3[p].level4.push(
                    dashboardRoutes.level2[i].level3[l].level4[n]
                  );
                }
              }
            }
          }
        }
      }
    }
  }
  // Clear up menu from empty levels
  let clearedLevels3 = [];
  let finalMenu = [
    {
      name: "level1",
      label: "Меню",
      state: true,
      level2: [],
    },
  ];

  // Clear menu from emty 3rd levels
  for (let n = 0; n < emptyLevels.length; n++) {
    if (emptyLevels[n].level3.length > 0) {
      clearedLevels3.push(emptyLevels[n]);
      // finalMenu[0].level2.push(emptyLevels[n])
    }
  }
  //  Clear menu from emty 4th levels
  for (let l = 0; l < clearedLevels3.length; l++) {
    let enabledToPush = true;
    for (let k = 0; k < clearedLevels3[l].level3.length; k++) {
      if (clearedLevels3[l].level3[k].level4 === null) {
        enabledToPush = true;
      } else {
        if (clearedLevels3[l].level3[k].level4.length > 0) {
          enabledToPush = true;
          break;
        } else {
          enabledToPush = false;
        }
      }
    }
    if (enabledToPush === true) {
      finalMenu[0].level2.push(clearedLevels3[l]);
    }
  }
  // console.log("FINAL MENU", finalMenu)
  return finalMenu;
}
// Admin function to update or create form
async function insertForm(incomingJson) {
  // console.log("formsToInsert: ", formsToInsert[7].formName)
  for (let i = 0; i < formsToInsert.length; i++) {
    let defId = formsToInsert[i].defid;
    let strForm = JSON.stringify(formsToInsert[i]);
    let body = {
      defid: defId,
      data: strForm,
    };
    // console.log("UPDATING: ", formsToInsert[i].formName)
    await request({
      headers: { "content-type": "application/json" },
      url: metaRESTApi + "/api/metadata/Update",
      body: body,
      json: true,
      method: "POST",
    })
      .then(async function (response) {
        let success = response[0].isSuccess;
        console.log("UPDATE FORM: ", success, formsToInsert[i].formName);
        if (success === false) {
          console.log("ERROR UPDATE TRY INSERT: ", formsToInsert[i].formName);
          await request({
            headers: { "content-type": "application/json" },
            url: metaRESTApi + "/api/metadata/Insert",
            body: body,
            json: true,
            method: "POST",
          })
            .then(function (response) {
              let success = response[0].isSuccess;
              // console.log("SUCCESS: ", success)
              clients[incomingJson.session_id].send(
                JSON.stringify({
                  messageType: "toast",
                  toastText: `${formsToInsert[i].formName} Created`,
                  toastType: "success",
                })
              );
            })
            .catch(function (error) {
              return console.log("FATAL ERROR: ", error);
            });
        }
        // else{
        //   clients[incomingJson.session_id].send(JSON.stringify({messageType: "toast", toastText: `${formsToInsert[i].formName} Updated`, toastType: "success"}))
        // }
      })
      .catch(function (error) {
        // ERROR
      });
    if (i === formsToInsert.length - 1) {
      clients[incomingJson.session_id].send(
        JSON.stringify({
          messageType: "toast",
          toastText: "Update completed",
          toastType: "success",
        })
      );
    }
  }
}
// ***WebSocket-server on port 3120***
var webSocketServer = new WebSocketServer.Server({ port: 3120 });
webSocketServer.on("connection", function (ws) {
  var id = getUUID();
  clients[id] = ws;
  console.log("New connection with " + id);
  clients[id].send(
    JSON.stringify({ messageType: "session_id", session_id: id })
  );
  // console.log("Sending session_id", id)
  ws.on("message", async function (message) {
    // console.log("Incoming message " + message)
    incomingJson = JSON.parse(message);
    if (incomingJson.commandType === "launchProcess") {
      // console.log("Calling REST", incomingJson);
      startCamundaProcess(
        incomingJson.session_id,
        incomingJson.process_id,
        incomingJson.processKey,
        incomingJson.variables
      );
    }
    else if (incomingJson.commandType === "completeTask") {
      console.log("COMPLETE TASK", incomingJson.variables);
      completeTask(incomingJson.variables, incomingJson.taskID);
    }
    else if (incomingJson.commandType === "getMenu") {
      // console.log("Sending routes to", id)
      clients[incomingJson.session_id].userRole =
        incomingJson.userProfile.userRole;
      clients[incomingJson.session_id].userId = incomingJson.userProfile.userId;
      clients[incomingJson.session_id].session_id = incomingJson.session_id;
      let routes = await generateMenu(incomingJson.userProfile);
      clients[id].send(JSON.stringify({ messageType: "Menu", routes }));
    }
    else if (incomingJson.commandType === "restoreSession") {
      console.log(
        "restoreSession for ",
        ConfigurationFile.rolesConfig[incomingJson.userRole],
        incomingJson.userId
      );
      await restoreSession(
        incomingJson.userId,
        incomingJson.session_id,
        incomingJson.userRole
      );
    }
    else if (incomingJson.commandType === "insertForm") {
      insertForm(incomingJson);
    }
    else if (incomingJson.commandType === "saveContract") {
      saveContract(incomingJson);
    }
    else if (incomingJson.commandType === "clearDocsArray") {
      saveContract(incomingJson);
    }
    else if (incomingJson.commandType === "deleteSavedDoc") {
      deleteSavedDoc(incomingJson);
    }
    else if (incomingJson.commandType === "downloadAccToExcel") {
      downloadAccToExcel(incomingJson);
    }
    else {
      console.log("Task", incomingJson);
    }
  });
  ws.on("close", function () {
    console.log("Connection closed " + id);
    delete clients[id];
  });
});
console.log("WS server work on port 3120");

async function sendRabbitMessage(msg) {
  let message = JSON.parse(msg);
  // console.log("MESSAGE", message)
  let taskVariables = JSON.parse(message.taskVariables);
  let session_id = message.session_id;
  let taskType = taskVariables.taskType;
  if (
    taskType === "showInstructionsSearchForm" ||
    taskType === "showInstructionsCreationForm" ||
    taskType === "showInstructionsViewForm" ||
    taskType === "showInstructionsTypeSelectingForm" ||
    taskType === "showInstructionsRegistrarsSearchForm" ||
    taskType === "showInstructionsRegistrarsViewForm"
  ) {
    await sendInstructionsForm(session_id, message, false);
  }
  else if (
    taskType === "showCreateUser" ||
    taskType === "showSearchUser" ||
    taskType === "showEditUser"
  ) {
    await sendUserForm(session_id, message, false);
  }
  else if (taskType === "setRoleToUser") {
    await setRoleToUser(session_id, message);
  }
  else if (taskType === "showToast") {
    await sendToast(taskVariables, message.taskID);
  }
  else if (
    taskType === "showPersonSearchForm" ||
    taskType === "showPersonCreatForm" ||
    taskType === "showPersonFilterForm" ||
    taskType === "showPersonOpenForm" ||
    taskType === "showPersonSaveForm"
  ) {
    await sendPersonForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showApplicationForm" ||
    taskType === "showAppStateForm" ||
    taskType === "showAppStateSaveForm" ||
    taskType === "showAppStateViewForm" ||
    taskType === "showFamMemberCreateForm" ||
    taskType === "showLandPlotCreateForm" ||
    taskType === "showIncomeCreateForm" ||
    taskType === "showTrusteePersonForm"
  ) {
    await sendAppStateForm(taskVariables, message.taskID);
  }
  else if (taskType === "showApplicationsGridForm") {
    await sendApplicationsGridForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showCloseMonthCreateParamForm" ||
    taskType === "showCloseMonthSearchParamForm" ||
    taskType === "showCloseMonthOnlyReadForm" ||
    taskType === "showCloseMonthGetListGridForm"
  ) {
    await sendCloseMonthForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showOpenBanckAccountGetListForm" ||
    taskType === "showOpenBankDistrRegisterForm"
  ) {
    await sendOpenBankAccountGetListForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showOpenBankAccountPreviewGridForm" ||
    taskType === "showOpenBankAccountRegisterForm" ||
    taskType === "showOpenBankAccDistrAppForms"
  ) {
    await sendCreateOpenBankAccountRegisterForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showUploadGetListGridForm" ||
    taskType === "showUploadDistrDetailGridForm" ||
    taskType === "showUploadBankAccountFileForm" ||
    taskType === "showUploadBankAccountSendFileForm"
  ) {
    await sendUploadGetListForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showRegistersForPaymentGetListForm" ||
    taskType === "showRegistersForPaymentDistrForm"
  ) {
    await sendRegistersForPaymentGetListForm(taskVariables, message.taskID);
  }
  else if (taskType === "showRegistersForPaymentDistrForm1") {
    await sendRegistersForPayment2GridForm(taskVariables, message.taskID);
  }
  else if (
    taskType === "showRegForPayCreatDetailForm" ||
    taskType === "showPreviewRegForPayDocListForm" ||
    taskType === "showRegForPayAssignDetailForm" ||
    taskType === "showRegForPayCreatDistrForm"
  ) {
    await sendCreateRegForPaymentForm(taskVariables, message.taskID);
  }
  else if (taskType === "showToast") {
    await sendToast(taskVariables, message.taskID);
  }
}

// Rabbit MQ server
amqp.connect("amqp://localhost", function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = "asist";
    // var queue = "amqp_depo_connection"
    channel.assertQueue(queue, {
      durable: false,
    });
    console.log("Waiting for messages from Camunda");
    channel.consume(
      queue,
      function (msg) {
        // console.log("CONSUMED MESSAGE")
        sendRabbitMessage(msg.content.toString());
      },
      {
        noAck: true,
      }
    );
  });
});
