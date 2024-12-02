document.addEventListener("DOMContentLoaded", function () {
  const assignUserBtns = document.querySelectorAll(".assignUserBtn");

  assignUserBtns.forEach((btn) => {
    btn.addEventListener("click", async function (event) {
      event.preventDefault();
      const projectId = this.getAttribute("data-projectId");
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

        const modal = $("#assignUserModal");
        modal.find('input[name="projectId"]').val(projectId); // Giả sử bạn có trường input với name là "projectId"

        modal.modal("show"); // Mở modal
      } catch (error) {
        let toast = new bootstrap.Toast(document.querySelector(".toast"), {});
        let toastBody = document.querySelector(".toast .toast-body");
        toastBody.innerHTML = error.message;
        toastBody.classList.add("text-danger");
        toast.show();
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  var assignUserModal = document.getElementById("assignUserModal");
  assignUserModal.addEventListener("show.bs.modal", function (event) {
    // Button that triggered the modal
    var button = event.relatedTarget;
    // Extract info from data-* attributes

    var projectId = button.getAttribute("data-projectId");

    // Update the modal's form fields
    var modal = this;

    modal.querySelector('input[name="projectId"]').value = projectId;
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const assignUserForm = document.getElementById("assginUserForm");

  // Xử lý submit form
  assignUserForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = {
      role: this.elements["role"].value,
      assignUser: this.elements["assign-user"].value,
      projectId: this.elements["projectId"].value,
    };
    console.log(formData);

    try {
      const response = await fetch("/project/list/assignUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to asigning user");
      }

      location.reload();
    } catch (error) {
      console.error("Error assigning user:", error);
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const editProjectBtns = document.querySelectorAll(".editProjectBtn");

  editProjectBtns.forEach((btn) => {
    btn.addEventListener("click", async function (event) {
      event.preventDefault();
      const projectId = this.getAttribute("data-project-id");
      const projectName = this.getAttribute("data-project-name");
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

        const modal = $("#editProject");
        modal.find('input[name="projectIdEdit"]').val(projectId);
        modal.find('input[name="projectNameEdit"]').val(projectName);
        modal.modal("show"); // Mở modal
      } catch (error) {
        let toast = new bootstrap.Toast(document.querySelector(".toast"), {});
        let toastBody = document.querySelector(".toast .toast-body");
        toastBody.innerHTML = error.message;
        toastBody.classList.add("text-danger");
        toast.show();
      }
    });
  });
});
