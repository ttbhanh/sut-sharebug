// Import helpers
const helpers = Handlebars.helpers;

function showEditRequirementModal(btn) {
  document.querySelector("#idEdit").value = btn.dataset.id;
  document.querySelector("#typeEdit").value = btn.dataset.type;
  document.querySelector("#descriptionEdit").value = btn.dataset.description;
  document.querySelector("#assignToEdit").value = btn.dataset.assignTo;
}

function loadRequirementDetails(btn) {
  console.log("Called");
  console.log(btn.dataset.id);

  document.querySelector("#requirementIdDetail").innerText = btn.dataset.id;
  document.querySelector("#requirementProjectIdDetail").innerText =
    btn.dataset.projectId;
  document.querySelector("#requirementTypeDetail").innerText = btn.dataset.type;
  document.querySelector("#requirementDescriptionDetail").innerText =
    btn.dataset.description;
  document.querySelector("#requirementCreatedAtDetail").innerText =
    btn.dataset.createdAt;
  document.querySelector("#requirementUpdatedAtDetail").innerText =
    btn.dataset.updatedAt;
  document.querySelector("#requirementAssigneeNameDetail").innerText =
    btn.dataset.assigneeName;
  document.querySelector("#requirementAssigneeEmailDetail").innerText =
    btn.dataset.assigneeEmail;
}

async function editRequirement(e) {
  e.preventDefault();

  const formData = new FormData(document.getElementById("editRequirementForm"));
  let data = Object.fromEntries(formData.entries());
  console.log(data);

  try {
    let res = await fetch(`/project/${data.projectId}/requirement`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.status == 200) {
      let result = await res.json();
      if (result.typeChanged) {
        window.location.href = `/project/${data.projectId}/requirement`;
      } else {
        location.reload();
      }
    } else {
      let resJSON = await res.json();
      throw new Error(resJSON.message);
    }
  } catch (error) {
    e.target.querySelector("#errorMessageEdit").innerText = error.message;
    console.log(error);
  }
}

document
  .querySelector("#editRequirement")
  .addEventListener("shown.bs.modal", () => {
    document.querySelector("#descriptionEdit").focus();
  });
//   để nó focus khi mở modal

async function deleteRequirement(id, pid) {
  try {
    let res = await fetch(`/project/${pid}/requirement/${id}`, {
      method: "DELETE",
    });

    if (res.status == 200) {
      location.reload();
    } else {
      let resJSON = await res.json();
      throw new Error(resJSON.message);
    }
  } catch (error) {
    let toast = new bootstrap.Toast(document.querySelector(".toast"), {});
    let toastBody = document.querySelector(".toast .toast-body");

    toastBody.innerHTML = error.message;
    toastBody.classList.add("text-danger");
    toast.show();

    console.log(error);
  }
}

function deleteClick(btn) {
  let id = btn.dataset.id;
  let pid = btn.dataset.projectId;

  const options = {
    title: "Are you sure?",
    type: "danger",
    btnOkText: "Yes",
    btnCancelText: "No",
    onConfirm: () => {
      console.log(id);
      deleteRequirement(id, pid);
    },
    onCancel: () => {
      console.log("Deletion canceled.");
    },
  };

  const {
    el,
    content,
    options: confirmedOptions,
  } = bs5dialog.confirm(
    "Do you really want to delete this requirement?",
    options
  );
}
