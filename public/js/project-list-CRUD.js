async function editProject(e) {
  e.preventDefault();
  const formData = new FormData(document.getElementById("editProjectForm"));
  let data = Object.fromEntries(formData.entries());
  console.log(data);
  try {
    let res = await fetch(`/project/${data.projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.status == 200) {
      location.reload();
    } else {
      let resJSON = await res.json();
      throw new Error(resJSON.message);
    }
  } catch (error) {
    showToast(error.message);
    console.log(error);
  }
}

async function deleteProject(id) {
  try {
    let res = await fetch(`/project/${id}`, {
      method: "DELETE",
    });

    if (res.status == 200) {
      location.reload();
    } else {
      let resJSON = await res.json();
      throw new Error(resJSON.message);
    }
  } catch (error) {
    showToast(error.message);
    console.log(error);
  }
}

document.querySelectorAll(".delete-btn").forEach((deleteBtn) => {
  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Ngăn chặn hành động mặc định của thẻ <a>

    let id = e.currentTarget.dataset.projectId;
    if (checkUserRole(id)) {
      const options = {
        title: "Are you sure?",
        type: "danger",
        btnOkText: "Yes",
        btnCancelText: "No",
        onConfirm: () => {
          deleteProject(id);
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
        "Do you really want to delete this project? All sub-resources will be deleted as well.",
        options
      );
    }
  });
});

function showToast(message) {
  let toast = new bootstrap.Toast(document.querySelector(".toast"), {});
  let toastBody = document.querySelector(".toast .toast-body");
  toastBody.innerHTML = message;
  toastBody.classList.add("text-danger");
  toast.show();
}

async function checkUserRole(projectId) {
  try {
    const response = await fetch("/project/list/check-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
    return true;
  } catch (error) {
    showToast(error.message);
    console.log(error);
    return false;
  }
}
